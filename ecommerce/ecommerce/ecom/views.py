from datetime import datetime
import os
from django.contrib import auth
from django.core.files.base import ContentFile
from django.core.checks.messages import Error
from django.http import request
from django.http.response import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib.auth import authenticate, get_user, get_user_model
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout

from django.db.models import Q
from django.contrib import messages
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_text
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from ecom.tokens import account_activation_token

import logging, re, json, time, iso3166, traceback

from ecom.models import Category, EcomUser, Order, OrderItem, PayPalTransaction, Product, ProductImage, Variation
from ecom.utils import capture_order, email_decrypt_uuid, email_encrypt_uuid, generate_email_link, get_cart_count, orderQtyAdd, orderQtyRem, validate_form, validate_status
from ecom.decorators import admin_only
from ecommerce.settings import MEDIA_ROOT

from djqscsv import render_to_csv_response

# Get an instance of a logger
logger = logging.getLogger(__name__)

# Create your views here.
def index(request):
    context = {
        # Give last 10 records
        'items': Product.objects.filter(hide=False).order_by('-created_at')[:10],
        'categories': Category.objects.all()
    }

    # Cart message
    num = get_cart_count(request)
    messages.info(request, 'cart-' + str(num))

    return render(request, 'ecom/index.html', context)

def login(request):
    if request.method == 'POST':
        username = request.POST.get('username', '')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            ecom_user = EcomUser.objects.get(user = user)

            if not ecom_user.email_confirmed:
                uidb64 = urlsafe_base64_encode(email_encrypt_uuid(urlsafe_base64_encode(force_bytes(ecom_user.user.id))))
                messages.info(request, 'uuid-' + uidb64)
                messages.error(request, 'login_error_verification')
                return redirect('index')
            
            auth_login(request, user)

            messages.success(request, 'login_success')
            return redirect('index')
        else:
            messages.error(request, 'login_error_pass')
            return redirect('index')

def logout(request):
    auth_logout(request)
    return redirect('index')

def products(request):
    return productsPage(request, 1)

def productsPage(request, page):
    cat = request.GET.get('cat', '')
    minval = request.GET.get('minval', '0')
    maxval = request.GET.get('maxval', '99999.99')
    search = request.GET.get('search', '')

    context = { }
    items = [ ]

    PRODUCTS_PER_PAGE = 12

    try:
        if(float(minval) < 0 or float(minval) > 99999.99):
            minval = 'invalid'
        
        if(float(maxval) < 0 or float(maxval) > 99999.99):
            maxval = 'invalid'
        
        if(cat != ''):
            items = Product.objects.filter(hide=False, category=Category.objects.get(pk=cat), discount_price__gte = minval, discount_price__lte = maxval, name__icontains=search)
        else:
            items = Product.objects.filter(hide=False, discount_price__gte = minval, discount_price__lte = maxval, name__icontains=search)
        
        paginator = Paginator(items, PRODUCTS_PER_PAGE)

        page = paginator.get_page(page)
            
        context['paginator'] = paginator
        context['page'] = page
        context['items'] = page.object_list
        context['categories'] = Category.objects.all()
        
    except (ValueError, ValidationError) as e:
        context['items'] = ''
    
    filters = { }
    for key in request.GET:
        value = request.GET[key]
        # Check if value is correct
        if(value != ''):
            if key == 'cat':
                filters['Category'] = Category.objects.get(pk=value)
            elif key == 'minval':
                filters['Min price'] = value + "$"
            elif key == 'maxval':
                filters['Max price'] = value + "$"
            elif key == 'search':
                filters['Search'] = value
    
    context['filters'] = filters
    
    # Cart message
    num = get_cart_count(request)
    messages.info(request, 'cart-' + str(num))

    return render(request, 'ecom/product-list.html', context)

def productDetail(request, id):
    context = { }

    items = Product.objects.filter(hide=False, id=id)

    if(len(items) > 1):
        logger.warn('There are ' + len(items) + ' products with id: ' + id + '!')
    elif (len(items) == 0):
        # Usually this should not happen by the website!
        return redirect('products')
    
    # Get product images
    productImages = [items[0].image]
    productImages.extend(ProductImage.objects.filter(product=items[0]))

    # Get product variations
    variationsList = Variation.objects.filter(product=items[0])
    variations = { }

    for var in variationsList:
        if(var.tag in variations):
            variations[var.tag][var.id] = var.tag_value
        else:
            variations[var.tag] = {var.id: var.tag_value}
    
    context['item'] = items[0]
    context['productImages'] = productImages
    context['variations'] = variations
    context['categories'] = Category.objects.all()

    # Cart message
    num = get_cart_count(request)
    messages.info(request, 'cart-' + str(num))
    
    return render(request, 'ecom/product-detail.html', context)

def myAccount(request):
    # Cart message
    num = get_cart_count(request)
    messages.info(request, 'cart-' + str(num))

    return render(request, 'ecom/my-account.html')

def register(request):
    if request.user.is_authenticated:
        redirect('index')
    
    try:
        if request.method == 'POST':
            # Required
            email = request.POST['email']
            username = request.POST['username']
            password = request.POST['password1']

            # Not required
            first = request.POST.get('first', '')
            last = request.POST.get('last', '')
            address = request.POST.get('address', '')
            country = request.POST.get('country', '')

            # Check for validy
            validate_form(email, username, password, country)
            
            # Create user
            user = get_user_model().objects.create_user(username, email, password)

            if(first != ''):
                user.first_name = first
            
            if(last != ''):
                user.last_name = last
            
            user.save()
            
            ecom_user = EcomUser(user=user, address=address, country=country)

            ecom_user.save()

            # Perform login
            # user = authenticate(request, username=username, password=password)
            # auth_login(request, user)

            email_link = generate_email_link(request, ecom_user)

            sent = send_mail(
                'Email verification code',
                'Link: ' + email_link,
                'danielgudjenev@gmail.com',
                [email],
                fail_silently=False,
            ) # Message is sent, but GMAIL says the address doesn't exist

            if sent == 0:
                # Invalid email
                ecom_user.delete()
                messages.error('email_invalid')
                return redirect('index')
            
            messages.success(request, 'check_email')


            return redirect('index')
            
    except Exception as e:
        if e.__str__ == 'Invalid Country':
            messages.error(request, e)
        elif e.__class__.__name__ == 'IntegrityError':
            logger.debug('LO: ' + e.__str__())
            if re.compile('already exists').search(e.__str__()):
                messages.error(request, 'Username/Email already exists')
        else:
            messages.error(request, 'Invalid Form')
        logger.error(request, e)
    
    context = { 'countries': iso3166.countries }

    return render(request, 'ecom/register.html', context)

def cart(request):
    if request.user.is_authenticated:
        user = EcomUser.objects.get(user = request.user)
        context = {'items': Order.objects.filter(user = user, status = Order.OrderStatus.NOT_ORDERED)}

        # Cart message
        num = get_cart_count(request)
        messages.info(request, 'cart-' + str(num))

        return render(request, 'ecom/cart.html', context)

def addToCart(request):
    # TODO: Fix bug -> If product A has 1 quantity, and two people have the product in their cart,
    # if on day the 1 first guy bought it, the other guy will get an error when trying to buy it!
    # TODO: Fix bug -> If product A has 1 quantity, and someone add it in their cart
    # and then go to the product, it will allow them to get one more quantity
    try:
        if request.user.is_authenticated:
            id = request.GET['id']
            quantity = request.GET.get('quantity', '1')
            variation = request.GET.get('var', '-1')
            isCart = request.GET.get('cart', False)
            ecom_user = get_object_or_404(EcomUser, user=request.user)
            product = get_object_or_404(Product, id=id)
            if(variation != '-1'):
                product = get_object_or_404(Variation, id=variation, product=product).variation
            order, created = Order.objects.get_or_create(user = ecom_user, status = Order.OrderStatus.NOT_ORDERED)

            orderItem, created = order.items.get_or_create(product = product)

            if not created:
                orderItem.quantity += int(quantity)
                orderItem.save()
            else:
                order.items.add(orderItem)
            
            if not isCart:
                messages.success(request, 'product_added')
                return redirect('products')
            
            return redirect('cart')
    except Exception as e:
        messages.error(request, 'product_error')
        
        return redirect('products')

def removeFromCart(request):
    try:
        if request.user.is_authenticated:
            id = request.POST['orderid']
            quantity = request.POST.get('quantity', '-1')

            if quantity == '-1':
                OrderItem.objects.get(id = id).delete()
            else:
                item = OrderItem.objects.get(id = id)
                if item.quantity > 1:
                    item.quantity -= quantity
                    item.save()

            messages.success(request, 'cart_removed')
            return redirect('cart')
    except Exception as e:
        logger.error(e)

        messages.error(request, 'cart_error')
        return redirect('cart')

def checkout(request):
    if request.user.is_authenticated:
        user = EcomUser.objects.get(user = request.user)
        if len(Order.objects.filter(user = user, status = Order.OrderStatus.NOT_ORDERED)) == 0:
            return redirect('index')
        
        context = {
            'items': Order.objects.filter(user = user, status = Order.OrderStatus.NOT_ORDERED),
            'ecom_user': user
        }

        # Cart message
        num = get_cart_count(request)
        messages.info(request, 'cart-' + str(num))
        
        return render(request, 'ecom/checkout.html', context)

def activateAccount(request, uidb64, token):
    try:
        uid = force_text(urlsafe_base64_decode(uidb64))
        us = get_user_model().objects.get(pk=uid)
        ecom_user = EcomUser.objects.get(user=us)
    except (TypeError, ValueError, OverflowError, get_user_model().DoesNotExist) as e:
        ecom_user = None
    if ecom_user is not None and account_activation_token.check_token(ecom_user, token):
        ecom_user.email_confirmed = True
        ecom_user.save()

        auth_login(request, ecom_user.user)
        messages.success(request, 'email_validation')

        return redirect('index')
    else:
        # invalid link
        messages.error(request, 'email_validation')
        return redirect('index')

def emailResend(request, uidb64):
    try:
        uid = urlsafe_base64_decode(force_text(email_decrypt_uuid(urlsafe_base64_decode(uidb64))))
        user = get_user_model().objects.get(pk=uid)
        ecom_user = EcomUser.objects.get(user=user)

        if ecom_user.email_confirmed:
            messages.success(request, 'email_already_verified')
            return redirect('index')
        email_link = generate_email_link(request, ecom_user)

        user.email_user(
            'Email verification code',
            'Link: ' + email_link,
            'danielgudjenev@gmail.com',
            fail_silently=False,
        )

        messages.success(request, 'email_verification_sent')
        return redirect('index')
    except:
        messages.error(request, 'email_verification_error')
        return redirect('index')

def captureOrder(request):
    try:
        if request.method == "POST":
            order_id = json.loads(request.body)['orderID']
            uid, order = capture_order(order_id)

            PayPalTransaction.objects.get_or_create (
                transaction_id = order_id,
                paypal_request_id = uid,
                status_code = order.status_code,
                status = order.result.status,
                email_address = order.result.payer.email_address,
                first_name = order.result.payer.name.given_name,
                last_name = order.result.payer.name.surname
            )

            return validate_status(request, uid, order_id, order)
        return JsonResponse({'msg': 'redirect', 'status': 'redirect'})
    except Exception as e:
        # Save to DB
        pass

def administration(request):
    context = {
        'items': Order.objects.all().order_by('-ordered_at')[:10],
        'selected': 'dashboard'
    }
    if request.method == 'GET':
        if request.user.is_authenticated:
            if request.user.is_staff:
                return render(request, 'admin1/index.html', context)
            else:
                messages.error(request, 'no_staff')
        
        return render(request, 'admin1/login/index.html')
    elif request.method == 'POST':
        username = request.POST.get('username', '')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None and user.is_staff:
            auth_login(request, user)
            return render(request, 'admin1/index.html', context)
        else:
            messages.error(request, 'login_user_or_staff')
        return render(request, 'admin1/login/index.html')

@admin_only
def adminProducts(request):
    return adminProductsPage(request, 1)
@admin_only
def adminProductsPage(request, page):
    # Get values
    category = request.GET.get('category', '')
    name = request.GET.get('name', '')
    min_price = request.GET.get('min-price', '0')
    max_price = request.GET.get('max-price', '9999.99')

     # Check the values
    try:
        if float(min_price) > 9999.99 or float(min_price) < 0 \
            or float(max_price) > 9999.99 or float(max_price) < 0:
            min_price = 0
            max_price = 0
    except Exception as e:
        traceback.print_exc()
        return redirect('adminProducts')
    
    PRODUCTS_PER_PAGE = 20

    if category == '':
        items = Product.objects.filter(hide=False, name__icontains=name, discount_price__gte=min_price, discount_price__lte=max_price)
    else:
        items = Product.objects.filter(hide=False, category=Category.objects.get(id=category), name__icontains=name, discount_price__gte=min_price, discount_price__lte=max_price)

    paginator = Paginator(items, PRODUCTS_PER_PAGE)

    page = paginator.get_page(page)
    
    context = {
        'paginator': paginator,
        'page': page,
        'categories': Category.objects.all(),
        'items': page.object_list,
        'selected': 'products'
    }
    return render(request, 'admin1/products.html', context)

@admin_only
def adminOrders(request):
    return adminOrdersPage(request, 1)

@admin_only
def adminOrdersPage(request, page):
    context = { }
    items = Order.objects.filter(status__gte = 1)
    ORDERS_PER_PAGE = 20
    # Get values
    stat = request.GET.get('stat', '-1')
    user = request.GET.get('user', '')
    ord_after = request.GET.get('ord-after', '0')
    ord_before = request.GET.get('ord-before', '0')

    try:
        if(ord_after == '0'):
            ord_after = datetime.fromisoformat('2000-01-01')
        else:
            ord_after = datetime.strptime(ord_after, '%Y-%m-%dT%H:%M')
        if(ord_before == '0'):
            ord_before = datetime.now()
        else:
            ord_before = datetime.strptime(ord_before, '%Y-%m-%dT%H:%M')
        
        if stat == '-1':
            stat = Order.OrderStatus.values
        else:
            stat = [int(stat)]

        if user == '':
            items = Order.objects.filter(status__in=stat, ordered_at__range=(ord_after, ord_before))
        else:
             items = Order.objects.filter(status__in=stat, user = EcomUser.objects.get(user = get_user_model().objects.get(username = user)), ordered_at__range=(ord_after, ord_before))
    except (ValueError, ValidationError) as e:
        traceback.print_exc()
        context['items'] = ''

    # Display order page

    paginator = Paginator(items, ORDERS_PER_PAGE)

    page = paginator.get_page(page)

    statuses = { }

    for orderstatus in Order.OrderStatus.choices:
        statuses[orderstatus[0]] = orderstatus[1]
            
    context['paginator'] = paginator
    context['page'] = page
    context['products'] = Product.objects.all()
    context['users'] = EcomUser.objects.all()
    context['statuses'] = statuses
    context['items'] = page.object_list
    context['selected'] = 'orders' # November 13, 2021 - 19:40:24 - %B %d, %Y - %H:%M:%S
    return render(request, 'admin1/orders.html', context)

@admin_only
def adminAddProduct(request):
    image = request.FILES.get('image', '')
    name = request.POST.get('name', '')
    category = request.POST.get('category', '')
    price = request.POST.get('price', '')
    discount_price = request.POST.get('discount-price', '')
    quantity = request.POST.get('quantity', '')
    description = request.POST.get('description', '')
    hide = request.POST.get('hide', '')
        
    # Check the values
    try:
        if float(price) > 9999.99 or float(price) < 0 \
            or float(discount_price) > 9999.99 or float(discount_price) < 0:
            messages.error(request, 'product_edit_error_price')
            return redirect('adminProducts')
    except Exception as e:
        traceback.print_exc()
        messages.error(request, 'product_edit_error_unknown')
        return redirect('adminProducts')
    
    if hide == 'on':
        hide = True
    else:
        hide = False

    product = Product.objects.create(name = name, category=Category.objects.get(id=category), price = price, discount_price = discount_price, quantity = quantity, description = description, hide = hide)
    
    productid = product.id

    if image != '':
        # Upload the image
        try:
            os.mkdir(os.path.join(MEDIA_ROOT, 'id'+str(productid)))
        except:
            pass

        # save the uploaded file inside that folder.
        full_filename = os.path.join(MEDIA_ROOT, 'id'+str(productid), image.name)
        fout = open(full_filename, 'wb+')
        file_content = ContentFile( image.read() )
        # Iterate through the chunks.
        for chunk in file_content.chunks():
            fout.write(chunk)
        fout.close()

        product.image = 'id'+str(productid) + os.sep + image.name
        product.save()

    messages.success(request, 'product_created')
    return redirect('adminProducts')

@admin_only
def adminDelProduct(request):
    ids = request.POST.getlist('id')

    for id in ids:
        Product.objects.filter(id = id).delete()
    
    messages.success(request, 'product_deleted')
    return redirect('adminProducts')

@admin_only
def adminAddOrder(request):
    items = request.POST.getlist('items[]')
    user = request.POST.get('user', '')
    status = request.POST.get('status', '')

    us = get_user_model().objects.get(username = user)
    ecom_user = EcomUser.objects.get(user = us)

    order = Order.objects.create(user = ecom_user, status = status)

    for item in items:
        product = item.split(sep=', ')[0]
        quantity = item.split(sep=', ')[1]
        orderItem, created = order.items.get_or_create(product = Product.objects.get(id = product), quantity = quantity)
    
    if int(status) > 0:
        order.ordered_at = timezone.localtime(timezone.now())
        order.save()
        orderQtyRem(order)
    
    messages.success(request, 'order_created')
    return redirect('adminOrders')

@admin_only
def adminDelOrder(request):
    ids = request.POST.getlist('id')

    for id in ids:
        order = Order.objects.filter(id = id)

        orderQtyAdd(order)

        order.delete()
    
    messages.success(request, 'order_deleted')
    return redirect('adminOrders')

@admin_only
def adminEditOrder(request, orderid):
    if request.method == 'GET':
        statuses = { }

        for orderstatus in Order.OrderStatus.choices:
            statuses[orderstatus[0]] = orderstatus[1]

        context = {
            'order': Order.objects.get(id = orderid),
            'products': Product.objects.all(),
            'selected': 'orders',
            'statuses': statuses
        }

        return render(request, 'admin1/edit-order.html', context)
    elif request.method == 'POST':
        items = request.POST.getlist('items[]')
        user = request.POST.get('user', '')
        status = request.POST.get('status', '')
        ordered_at = request.POST.get('ordered_date', '')

        order = Order.objects.get(id = orderid)

        orderQtyAdd(order)

        order.items.clear()
        for item in items:
            product = item.split(sep=', ')[0]
            quantity = item.split(sep=', ')[1]
            orderItem = order.items.create(product = Product.objects.get(id = product), quantity = quantity)
        
        order.user = EcomUser.objects.get(user = get_user_model().objects.get(username = user))
        order.status = int(status)
        order.ordered_at = timezone.make_aware(datetime.strptime(ordered_at, "%Y-%m-%dT%H:%M"))

        order.save()

        orderQtyRem(order)

        messages.success(request, 'order_edited')
        return redirect('adminOrders')

@admin_only
def adminEditProduct(request, productid):
    if request.method == 'GET':

        context = {
            'product': Product.objects.get(id=productid),
            'categories': Category.objects.all(),
            'selected': 'products',
        }

        return render(request, 'admin1/edit-product.html', context)
    elif request.method == 'POST':
        image = request.FILES.get('image', '')
        name = request.POST.get('name', '')
        category = request.POST.get('category', '')
        price = request.POST.get('price', '')
        discount_price = request.POST.get('discount-price', '')
        quantity = request.POST.get('quantity', '')
        description = request.POST.get('description', '')
        hide = request.POST.get('hide', '')

        # Check the values
        try:
            if float(price) > 9999.99 or float(price) < 0 \
                or float(discount_price) > 9999.99 or float(discount_price) < 0:
                messages.error(request, 'product_edit_error_price')
                return redirect('adminProducts')
        except Exception as e:
            traceback.print_exc()
            messages.error(request, 'product_edit_error_unknown')
            return redirect('adminProducts')
        
        product = Product.objects.get(id = productid)

        if image != '':
            # Upload the image
            try:
                os.mkdir(os.path.join(MEDIA_ROOT, 'id'+str(productid)))
            except:
                pass

            # save the uploaded file inside that folder.
            full_filename = os.path.join(MEDIA_ROOT, 'id'+str(productid), image.name)
            fout = open(full_filename, 'wb+')
            file_content = ContentFile( image.read() )
            # Iterate through the chunks.
            for chunk in file_content.chunks():
                fout.write(chunk)
            fout.close()

            product.image = 'id'+str(productid) + os.sep + image.name
        
        # Finish the table
        
        product.name = name
        product.category = Category.objects.get(id = category)
        product.price = price
        product.discount_price = discount_price
        product.quantity = quantity
        product.description = description

        if hide == 'on':
            product.hide = True
        else:
            product.hide = False
        
        product.save()

        messages.success(request, 'product_edited')
        return redirect('adminProducts')


@admin_only
def adminRemoveCat(request):
    id = request.POST.get('id', '')
    cat = Category.objects.get(id=id)

    if(cat):
        cat.delete()
    
    return redirect('adminProducts')

@admin_only
def adminAddCat(request):
    name = request.POST.get('name', '')
    image = request.POST.get('image', '')
    cat = Category.objects.filter(name = name)

    if(not cat):
        Category.objects.create(name = name, image_css = image)
    
    return redirect('adminProducts')

@admin_only
def adminAccounts(request):
    return adminAccountsPage(request, 1)

@admin_only
def adminAccountsPage(request, page):
    context = { }
    ACCOUNTS_PER_PAGE = 20
    # Get values
    user = request.GET.get('user', '')
    email = request.GET.get('email', '')
    country = request.GET.get('country', '')
    staff = request.GET.get('staff', [False, True])
    active = request.GET.get('active', [False, True])

    try:
        if staff == 'on':
            staff = [True]
        if active == 'on':
            active = [True]
        
        items = EcomUser.objects.filter(user__username__icontains = user, user__email__icontains = email, user__is_staff__in = staff, user__is_active__in = active, country__icontains = country)
    except (ValueError, ValidationError) as e:
        traceback.print_exc()
        items = { }
    
    # Display order page

    paginator = Paginator(items, ACCOUNTS_PER_PAGE)

    page = paginator.get_page(page)
            
    context['paginator'] = paginator
    context['page'] = page
    context['items'] = page.object_list
    context['selected'] = 'accounts'
    return render(request, 'admin1/accounts.html', context)

def adminReport(request):
    return adminReportPage(request, 1)

def adminReportPage(request, page):
    context = { }
    statuses = { }
    REPORTS_PER_PAGE = 20

    products = request.GET.getlist('product[]')
    user = request.GET.get('user', '')
    country = request.GET.get('country', '')
    status = request.GET.get('stat', '-1')
    ord_after = request.GET.get('ord-after', '0')
    ord_before = request.GET.get('ord-before', '0')

    try:
        if(ord_after == '0'):
            ord_after = timezone.make_aware(datetime.fromisoformat('2000-01-01'))
        else:
            ord_after = timezone.make_aware(datetime.strptime(ord_after, '%Y-%m-%dT%H:%M'))
        if(ord_before == '0'):
            ord_before = timezone.make_aware(datetime.now())
        else:
            ord_before = timezone.make_aware(datetime.strptime(ord_before, '%Y-%m-%dT%H:%M'))
        
        if status == '-1':
            status = Order.OrderStatus.values
        else:
            status = [int(status)]
        if products:
            conditions = Q()
            for product in products:
                conditions |= Q(items__product__name__icontains = product)
            items = Order.objects.filter(conditions, status__in = status, user__user__username__icontains = user, user__country__icontains = country, ordered_at__range=(ord_after, ord_before))
        else:
            items = Order.objects.filter(status__in = status, user__user__username__icontains = user, user__country__icontains = country, ordered_at__range=(ord_after, ord_before))
    except Exception as e:
        traceback.print_exc()
        items = { }

    for orderstatus in Order.OrderStatus.choices:
        statuses[orderstatus[0]] = orderstatus[1]
    
    paginator = Paginator(items, REPORTS_PER_PAGE)

    page = paginator.get_page(page)
    
    context['paginator'] = paginator
    context['page'] = page
    context['items'] = page.object_list
    context['statuses'] = statuses
    context['items'] = items
    context['selected'] = 'report'

    return render(request, 'admin1/report.html', context)

def adminReportExcel(request):
    products = request.GET.getlist('product[]')
    user = request.GET.get('user', '')
    country = request.GET.get('country', '')
    status = request.GET.get('stat', '-1')
    ord_after = request.GET.get('ord-after', '0')
    ord_before = request.GET.get('ord-before', '0')

    try:
        if(ord_after == '0'):
            ord_after = timezone.make_aware(datetime.fromisoformat('2000-01-01'))
        else:
            ord_after = timezone.make_aware(datetime.strptime(ord_after, '%Y-%m-%dT%H:%M'))
        if(ord_before == '0'):
            ord_before = timezone.make_aware(datetime.now())
        else:
            ord_before = timezone.make_aware(datetime.strptime(ord_before, '%Y-%m-%dT%H:%M'))
        
        if status == '-1':
            status = Order.OrderStatus.values
        else:
            status = [int(status)]
        if products:
            conditions = Q()
            for product in products:
                conditions |= Q(items__product__name__icontains = product)
            items = Order.objects.filter(conditions, status__in = status, user__user__username__icontains = user, user__country__icontains = country, ordered_at__range=(ord_after, ord_before))
        else:
            items = Order.objects.filter(status__in = status, user__user__username__icontains = user, user__country__icontains = country, ordered_at__range=(ord_after, ord_before))
    except Exception as e:
        traceback.print_exc()
        return None

    return render_to_csv_response(items, filename="report_" + timezone.make_aware(datetime.now()).strftime('%Y%m%d%H:%M'))