from re import U
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http.response import HttpResponse, JsonResponse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth import authenticate, login
from django.utils import timezone

import ecom.models as models
from ecom.tokens import account_activation_token

import iso3166, os, binascii, uuid, time, base64

from Crypto.Cipher import AES
from Crypto.Util import Counter
from ecom.PayPalClient import client
from paypalcheckoutsdk.orders import OrdersCaptureRequest

from ecom.exceptions import NotEnoughQuantityException

def validate_form(email, username, password, country):
    validate_email(email)

    invalidC = True
    for cc in iso3166.countries:
        if cc.name == country:
            invalidC = False
            break

    if invalidC:
        raise ValidationError("Invalid Country")


def get_cart_count(request):
    order = None

    if not request.user.is_anonymous:
        ecom = models.EcomUser.objects.get(user=request.user)
        order = models.Order.objects.filter(
            user=ecom, status=models.Order.OrderStatus.NOT_ORDERED).first()
    else:
        # Check from cookies
        pass
    num = '0'

    if order is not None:
        num = order.get_items_count()

    return num


def generate_email_link(request, ecom_user):
    uidb64 = urlsafe_base64_encode(force_bytes(ecom_user.user.id))
    token = account_activation_token.make_token(ecom_user)
    location = request.get_host()

    return location + '/activate_account/' + uidb64 + '/' + token


def email_encrypt_uuid(uuid):
    iv = os.urandom(16)
    ctr = Counter.new(128, initial_value=int(binascii.hexlify(iv), 16))
    aes = AES.new(os.environ.get('AES_KEY', None), AES.MODE_CTR, counter=ctr)
    return iv + aes.encrypt(uuid)


def email_decrypt_uuid(uuidEnc):
    iv = uuidEnc[:16]
    ctr = Counter.new(128, initial_value=int(binascii.hexlify(iv), 16))
    aes = AES.new(os.environ.get('AES_KEY', None), AES.MODE_CTR, counter=ctr)
    return aes.decrypt(uuidEnc[16:])

def orderQtyRem(cart):
    for item in cart.items.all():
        if item.product.quantity < item.quantity:
            raise NotEnoughQuantityException(item.product + " has only " + item.product.quantity + " qty, but order #" + cart.id + " is trying to order " + item.quantity + "!")
        item.product.quantity -= item.quantity
        item.save()

    cart.save()

def orderQtyAdd(cart):
    for item in cart.items.all():
        item.product.quantity += item.quantity
        item.save()

    cart.save()

def product_delete_images(id):
    for image in models.ProductImage.objects.filter(product = id):
        image.deleted = True
        image.save()

def product_delete_variations(id):
    for var in models.Variation.objects.filter(product = id):
        var.deleted = True
        var.save()

def give_pages(paginator, page):
    pages = []

    if paginator.num_pages <= 3:
        if paginator.num_pages == 1:
            return ['1']
        elif paginator.num_pages == 2:
            return ['1', '2']
        elif paginator.num_pages == 3:
            return ['1', '2', '3']

    if page.number <= 3:
            if page.number == 1:
                pages = ['1', '2', '...', str(paginator.num_pages)]
            elif page.number == 2:
                pages = [str(page.number - 1), str(page.number), str(page.number + 1), '...', str(paginator.num_pages)]
            else:
                pages = ['1', str(page.number - 1), str(page.number), str(page.number + 1), '...', str(paginator.num_pages)]
    elif paginator.num_pages - page.number <= 3:
        if paginator.num_pages - page.number == 0:
            pages = ['1', '...', str(page.number - 1), str(paginator.num_pages)]
        elif paginator.num_pages - page.number == 1:
            pages = ['1', '...', str(page.number - 1), str(page.number), str(paginator.num_pages)]
        elif paginator.num_pages - page.number == 2:
            pages = ['1', '...', str(page.number - 1), str(page.number), str(page.number + 1), str(paginator.num_pages)]
        else:
            pages = ['1', '...', str(page.number - 1), str(page.number), str(page.number + 1), '...', str(paginator.num_pages)]
    else:
        pages = ['1', '...', str(page.number - 1), str(page.number), str(page.number + 1), '...', str(paginator.num_pages)]
    
    return pages

def capture_order(order_id, debug=False):
    """Method to capture order using order_id"""
    request = OrdersCaptureRequest(order_id)

    uid = uuid.uuid4()
    request.pay_pal_request_id(uid)

    # 3. Call PayPal to capture an order
    response = client.client.execute(request)
    # 4. Save the capture ID to your database. Implement logic to save capture to your database for future reference.
    """ if debug:
      print 'Status Code: ', response.status_code
      print 'Status: ', response.result.status
      print 'Order ID: ', response.result.id
      print 'Links: '
      for link in response.result.links:
        print('\t{}: {}\tCall Type: {}'.format(
            link.rel, link.href, link.method))
      print 'Capture Ids: '
      for purchase_unit in response.result.purchase_units:
        for capture in purchase_unit.payments.captures:
          print '\t', capture.id
      print "Buyer:"
      print "\tEmail Address: {}\n\tName: {}\n\tPhone Number: {}".format(response.result.payer.email_address,
        response.result.payer.name.given_name + \
            " " + response.result.payer.name.surname,
        response.result.payer.phone.phone_number.national_number) """
    return uid, response

def validate_status(request, uid, order_id, order):
    if order.result.status == 'COMPLETED':
        # Order is completed
        ecom_user = models.EcomUser.objects.get(user=request.user)

        cart = models.Order.objects.filter(
            user=ecom_user, status=models.Order.OrderStatus.NOT_ORDERED)[0]
        cart.status = models.Order.OrderStatus.PENDING
        cart.ordered_at = timezone.now()

        orderQtyRem(cart)

        return JsonResponse({'msg': 'Your order is completed!', 'status': 'ok'})
    elif order.result.status == 'VOIDED':
        # Order cannot be proceeded
        return JsonResponse({'msg': 'An error occured while trying to proceed your request! Please contact us!', 'status': 'error'})
    elif order.result.status == 'PAYER_ACTION_REQUIRED':
        # Additional action from the user is required
        for link in order.result.links:
            if link.rel == 'payer-action':
                return JsonResponse({'msg': 'Additional action is required! (3DS Auth?) Please click \
                    <a href='+link.href+' target="_blank" rel="noopener noreferrer">here</a>!', 'status': 'alert'})
                
        # This should not happen
        return JsonResponse({'msg': 'Internal server error happened! Please contact support! Transaction id: '+order_id, 'status':'error'})
    elif order.result.status == 'CREATED' or \
        order.result.status == 'SAVED' or \
        order.result.status == 'APPROVED':
            # Try again after short period
            time.sleep(2)
            uid, order = capture_order(order_id)
            if order.result.status != 'CREATED' and \
                order.result.status != 'SAVED' and \
                order.result.status != 'APPROVED':
                    return validate_status(request, uid, order_id, order)
            
            # TODO Now what?

# Random date
def str_time_prop(start, end, time_format, prop):
    """Get a time at a proportion of a range of two formatted times.

    start and end should be strings specifying times formatted in the
    given format (strftime-style), giving an interval [start, end].
    prop specifies how a proportion of the interval to be taken after
    start.  The returned time will be in the specified format.
    """

    stime = time.mktime(time.strptime(start, time_format))
    etime = time.mktime(time.strptime(end, time_format))

    ptime = stime + prop * (etime - stime)

    return time.strftime(time_format, time.localtime(ptime))


def random_date(start, end, prop):
    return str_time_prop(start, end, '%Y-%m-%d %I:%M', prop) 