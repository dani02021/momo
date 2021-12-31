import logging
import traceback
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator
from django.core.validators import validate_email
from django.db import connection
from django.db.backends.utils import CursorWrapper
from django.db.models.manager import BaseManager
from django.db.models.query import RawQuerySet
from django.db.utils import ProgrammingError
from django.db.models.aggregates import Count, Sum
from django.db.models.functions.datetime import Trunc
from django.db.models.query_utils import Q
from django.http.response import HttpResponse, JsonResponse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth import authenticate, login
from django.utils import timezone
from psycopg2.errors import DuplicatePreparedStatement

import ecom.models as models
from ecom.utils import *
from ecom.tokens import account_activation_token

import iso3166, os, binascii, uuid, time, base64

from Crypto.Cipher import AES
from Crypto.Util import Counter
from ecom.PayPalClient import client
from paypalcheckoutsdk.orders import OrdersCaptureRequest

from ecom.exceptions import NotEnoughQuantityException

from dqp import prepare_sql

# Get an instance of a logger
logger = logging.getLogger(__name__)


def has_role(ecom_user_id, role):
    try:
        ecomroles = models.EcomUserRole.objects.filter(user = models.EcomUser.objects.get(id = ecom_user_id), role = role)
        if ecomroles:
            return True
        return False
    except:
        return False

def has_role_permission(role, perm):
    try:
        perms = models.Role.objects.get(id = role).permissions.values_list('name')
        if (perm,) in perms:
            return True
        return False
    except:
        return False

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

"""
Substranct from the product quantity the amount in the order
"""
def orderQtyRem(cart):
    for item in cart.items.all():
        if item.product.quantity < item.quantity:
            raise NotEnoughQuantityException(item.product + " has only " + item.product.quantity + " qty, but order #" + cart.id + " is trying to order " + item.quantity + "!")
        item.product.quantity -= item.quantity
        item.product.save()
        item.save()

    cart.save()

"""
Add to the product quantity the amount in the order
"""
def orderQtyAdd(cart):
    for item in cart.items.all():
        item.product.quantity += item.quantity
        item.product.save()
        item.save()

    cart.save()

def product_delete_images(id):
    for image in models.ProductImage.objects.filter(product = id).iterator():
        image.deleted = True
        image.save()

def product_delete_variations(id):
    for var in models.Variation.objects.filter(product = id).iterator():
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
        cart.price = cart.get_total()
        cart.save()

        orderQtyRem(cart)

        return JsonResponse({'msg': 'Your order is completed!', 'status': 'ok'})
    elif order.result.status == 'VOIDED':
        # Order cannot be proceeded
        ecom_user = models.EcomUser.objects.get(user=request.user)

        cart = models.Order.objects.filter(
            user=ecom_user).filter(Q(status=models.Order.OrderStatus.NOT_ORDERED) | Q(status=models.Order.OrderStatus.PAYER_ACTION_REQUIRED))[0]
        cart.status = models.Order.OrderStatus.DECLINED
        cart.save()

        return JsonResponse({'msg': 'The payment has been rejected!', 'status': 'error'})
    elif order.result.status == 'PAYER_ACTION_REQUIRED':
        # Additional action from the user is required
        ecom_user = models.EcomUser.objects.get(user=request.user)

        cart = models.Order.objects.filter(
            user=ecom_user, status=models.Order.OrderStatus.NOT_ORDERED)[0]
        cart.status = models.Order.OrderStatus.PAYER_ACTION_REQUIRED
        cart.save()

        for link in order.result.links:
            if link.rel == 'payer-action':
                return JsonResponse({'msg': 'Additional action is required! (3DS Auth?) Please click \
                    <a href='+link.href+' target="_blank" rel="noopener noreferrer">here</a>!', 'status': 'alert'})
                
        # This should not happen
        return JsonResponse({'msg': 'Internal server error happened! Please contact support! Transaction ID: '+order_id, 'status':'error'})
    elif order.result.status == 'CREATED' or \
        order.result.status == 'SAVED' or \
        order.result.status == 'APPROVED':
            # Try again after short period
            time.sleep(3)
            uid, order = capture_order(order_id)

            # Don't change the status of the order

            if order.result.status != 'CREATED' and \
                order.result.status != 'SAVED' and \
                order.result.status != 'APPROVED':
                    return validate_status(request, uid, order_id, order)
            
            return JsonResponse({'msg': 'There was an error while processing your order! Please contact support! Transaction ID: ' + order_id, 'status': 'error'})

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

def report_items(REPORTS_PER_PAGE, groupby, ord_before, ord_after, page):
    items1 = models.Order.objects \
            .filter(deleted=False, status__gte = 1, ordered_at__range=(ord_after, ord_before)) \
            .annotate(start_day=Trunc('ordered_at', groupby)) \
            .values('start_day') \
            .annotate(orders=Count('id')) \
            .order_by('-start_day') \
            .values('start_day', 'orders')
    items2 = models.Order.objects \
            .filter(deleted=False, status__gte = 1, ordered_at__range=(ord_after, ord_before)) \
            .annotate(start_day=Trunc('ordered_at', groupby)) \
            .values('start_day') \
            .annotate(products=Count('items')) \
            .order_by('-start_day') \
            .values('start_day', 'products')
    items3 = models.Order.objects \
            .filter(deleted=False, status__gte = 1, ordered_at__range=(ord_after, ord_before)) \
            .annotate(start_day=Trunc('ordered_at', groupby)) \
            .values('start_day') \
            .annotate(total_price=Sum('price')) \
            .order_by('-start_day') \
            .values('start_day', 'total_price')
    
    # Give all
    if REPORTS_PER_PAGE == -1:
        REPORTS_PER_PAGE = items1.count()

    paginator = Paginator(items1, REPORTS_PER_PAGE)
    paginator2 = Paginator(items2, REPORTS_PER_PAGE)
    paginator3 = Paginator(items3, REPORTS_PER_PAGE)

    page2 = paginator2.get_page(page)
    page3 = paginator3.get_page(page)
    page = paginator.get_page(page)

    pages = give_pages(paginator, page)

    # Combine them all
    items = [ ]

    for item in page.object_list:
        items.append({ 'start_day': item['start_day'], 'orders': item['orders'] })
    
    index = 0

    for item in page2.object_list:
        items[index]['products'] = item['products']
        index = index + 1
    
    index = 0

    for item in page3.object_list:
        items[index]['total_price'] = item['total_price']
        index = index + 1
    
    return paginator, pages, items

@prepare_sql
def union_users_staff():
    return "SELECT auth_user.username, auth_user.email, auth_user.is_staff, auth_user.first_name, auth_user.last_name, ecom_ecomstaff.id, created_at, deleted, user_id, NULL as country FROM ecom_ecomstaff inner join auth_user on (ecom_ecomstaff.user_id = auth_user.id) union select auth_user.username, auth_user.email, auth_user.is_staff, auth_user.first_name, auth_user.last_name, ecom_ecomuser.id, created_at, deleted, user_id, country from ecom_ecomuser inner join auth_user on (ecom_ecomuser.user_id = auth_user.id) order by created_at DESC"

class PreparedStatement(object):

    def __init__(self, name, query, vars, types, model:BaseManager):
        self.name = name
        self.query = query
        self.vars = vars
        self.types = types
        self.model = model

    def prepare(self):
        try:
            SQL = "PREPARE %s %s AS " % (self.name, self.types)
            self.__executeQuery(SQL + " %s ;" % self.query)
        except ProgrammingError as e:
            if isinstance(e.__cause__, DuplicatePreparedStatement):
                pass
            traceback.print_exc()

    def get_prepared(self):
        # store a map of all prepared queries on the current connection
        try:
            getattr(connection, "__prepared")
        except AttributeError:
            setattr(connection,"__prepared",[])
        finally:
            return getattr(connection, "__prepared")

    def execute(self, **kwargs) -> RawQuerySet:

        if not self.name in self.get_prepared():
           # Statement will be prepared once per session.
           self.prepare()

        SQL = "EXECUTE %s " % self.name

        if self.vars:
            missing_vars = set(self.vars) - set(kwargs)
            if missing_vars:
                raise TypeError("Prepared Statement %s requires variables: %s" % (
                                    self.name, ", ".join(missing_vars) ) )

            param_vals = [ "'" + kwargs[var] + "'" for var in self.vars ]

            for indx, var in enumerate(param_vals):
                if var == '':
                    param_vals[indx] = "'%'"

            logger.error(param_vals)
            logger.error(kwargs)

            SQL += "(" + ", ".join( param_vals ) + ")"

            logger.debug(SQL)

            return self.__executeQuery(SQL)
        else:
            return self.__executeQuery(SQL)
    
    def deallocate(self)  -> RawQuerySet:
        SQL = "deallocate %s" % self.name
        return self.__executeQuery(SQL)
    
    def __executeQuery(self,query)  -> RawQuerySet:
        return self.model.raw(query)

