from datetime import datetime
import os
from django.contrib import auth
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.checks.messages import Error
from django.db.models.aggregates import Sum
from django.db.models.expressions import Value
from django.db.models.fields import CharField, DateTimeField
from django.http import request
from django.http.response import FileResponse, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib.auth import authenticate, get_user, get_user_model
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout

from django.db.models import Q, F, Count
from django.db.models.functions import Trunc
from django.contrib import messages
from django.core import serializers
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_text
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.cache import cache_page

from tempfile import NamedTemporaryFile

from ecom.tokens import account_activation_token

import re, json, iso3166, traceback

from ecom.models import *
from ecom.utils import *
from ecom.decorators import admin_only, has_permission
from ecom.exceptions import NotEnoughQuantityException
from ecom.generators import generateProducts
from ecommerce.settings import MEDIA_ROOT

ITEMS = Product.objects.filter(hide=False, deleted=False)

# Create your views here.
def index(request):
    context = {
        # Give last 10 records
        'items': Product.objects.filter(hide=False, deleted=False).order_by('-created_at')[:10],
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
            ecom_user = EcomUser.objects.get(deleted = False, user = user)

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
            items = Product.objects.filter(hide=False, deleted=False, category=Category.objects.get(pk=cat), discount_price__gte = minval, discount_price__lte = maxval, name__icontains=search)
        else:
            items = Product.objects.filter(hide=False, deleted=False, discount_price__gte = minval, discount_price__lte = maxval, name__icontains=search)
        
        paginator = Paginator(items, PRODUCTS_PER_PAGE)

        page = paginator.get_page(page)

        pages = give_pages(paginator, page)
            
        context['paginator'] = paginator
        context['page'] = page
        context['pages'] = pages
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

    items = Product.objects.filter(hide=False, deleted=False, id=id)

    if(len(items) > 1):
        logger.warn('There are ' + len(items) + ' products with id: ' + id + '!')
    elif (len(items) == 0):
        # Usually this should not happen by the website!
        return redirect('products')
    
    # Get product images
    productImages = [items[0].image]
    productImages.extend(ProductImage.objects.filter(deleted=False, product=items[0]))

    # Get product variations
    variationsList = Variation.objects.filter(deleted=False, product=items[0])
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

            if get_user_model().objects.filter(username = username):
                messages.warning(request, 'user_exists')
                return redirect('index')
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
                fail_silently=True,
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
        user = EcomUser.objects.get(deleted = False, user = request.user)
        context = {'items': Order.objects.filter(deleted=False, user = user, status = Order.OrderStatus.NOT_ORDERED)}

        # Cart message
        num = get_cart_count(request)
        messages.info(request, 'cart-' + str(num))

        return render(request, 'ecom/cart.html', context)

def addToCart(request):
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
                OrderItem.objects.get(deleted = False, id = id).delete()
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
        order = Order.objects.filter(deleted=False, user = user, status = Order.OrderStatus.NOT_ORDERED)
        if not order:
            return redirect('index')
        
        for item in order[0].items.all():
                if item.product.quantity < item.quantity:
                    messages.error(request, 'not_enough_quantity;'+ str(item.product.name))
        
        context = {
            'items': order,
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
            ordert = Order.objects.get(deleted = False, user = EcomUser.objects.get(deleted = False, user=request.user), status = Order.OrderStatus.NOT_ORDERED)
            # Check if products have enough quantity
            for item in ordert.items.all():
                if item.product.quantity < item.quantity:
                    return JsonResponse({'msg': 'There is no enough quantity of ' + str(item.product.name), 'status': 'error'})
            
            uid, order = capture_order(order_id)

            PayPalTransaction.objects.get_or_create (
                order = ordert,
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
        traceback.print_exc()
        pass

def administration(request):
    context = {
        'items': Order.objects.all().order_by('-ordered_at')[:10],
        'selected': 'dashboard'
    }
    if request.method == 'GET':
        if request.user.is_authenticated:
            return render(request, 'admin1/index.html', context)
        
        return render(request, 'admin1/login/index.html')
    elif request.method == 'POST':
        username = request.POST.get('username', '')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            auth_login(request, user)
            return render(request, 'admin1/index.html', context)
        else:
            messages.error(request, 'login_user_or_staff')
        return render(request, 'admin1/login/index.html')

@admin_only
@has_permission('products.read')
def adminProducts(request):
    return adminProductsPage(request, 1)

@admin_only
@has_permission('products.read')
def adminProductsPage(request, page):
    context = { }
    PRODUCTS_PER_PAGE = 20

    # Get values
    category = request.GET.get('category', '')
    name = request.GET.get('name', '')
    min_price = request.GET.get('min-price', '')
    max_price = request.GET.get('max-price', '')

    context['pass_name'] = name
    context['pass_minprice'] = min_price
    context['pass_maxprice'] = max_price

    # Check the values
    if min_price == '':
        min_price = '0'
    if max_price == '':
        max_price = '9999.99'
    
    try:
        if float(min_price) > 9999.99 or float(min_price) < 0 \
            or float(max_price) > 9999.99 or float(max_price) < 0:
            min_price = 0
            max_price = 0
    except Exception as e:
        traceback.print_exc()
        return redirect('adminProducts')
    
    if category == '':
        items = Product.objects.filter(hide=False, deleted=False, name__icontains=name, discount_price__gte=min_price, discount_price__lte=max_price).order_by('-created_at')
    else:
        items = Product.objects.filter(hide=False, deleted=False, category=Category.objects.get(id=category), name__icontains=name, discount_price__gte=min_price, discount_price__lte=max_price).order_by('-created_at')

    paginator = Paginator(items, PRODUCTS_PER_PAGE)

    page = paginator.get_page(page)

    pages = give_pages(paginator, page)
    
    context['paginator'] = paginator
    context['page'] = page
    context['pages'] =pages
    context['categories'] = Category.objects.all()
    context['items'] = page.object_list
    context['selected'] = 'products'

    if(category != ''):
        context['pass_cat'] = Category.objects.get(id=category).name
    
    return render(request, 'admin1/products.html', context)

@admin_only
def adminProductsGet(request):
    # Get values
    product = request.GET['term']

    items = Product.objects.filter(deleted = False, hide = False, name__istartswith=product).values('id', value=F('name'))

    return JsonResponse(list(items), safe=False)

@admin_only
@has_permission('orders.read')
def adminOrders(request):
    return adminOrdersPage(request, 1)

@admin_only
@has_permission('orders.read')
def adminOrdersPage(request, page):
    context = { }
    items = Order.objects.filter(deleted=False, status__gte=1).order_by('-ordered_at')
    ORDERS_PER_PAGE = 20
    # Get values
    stat = request.GET.get('stat', '')
    user = request.GET.get('user', '')
    ord_after = request.GET.get('ord-after', '')
    ord_before = request.GET.get('ord-before', '')

    try:
        if(ord_after == ''):
            ord_after = timezone.make_aware(datetime.fromisoformat('2000-01-01'))
            context['pass_ord_after'] = ''
        else:
            ord_after = timezone.make_aware(datetime.strptime(ord_after, '%Y-%m-%dT%H:%M'))
            context['pass_ord_after'] = ord_after.strftime('%Y-%m-%dT%H:%M')
        if(ord_before == ''):
            ord_before = timezone.make_aware(datetime.now())
            context['pass_ord_before'] = ''
        else:
            ord_before = timezone.make_aware(datetime.strptime(ord_before, '%Y-%m-%dT%H:%M'))
            context['pass_ord_before'] = ord_before.strftime('%Y-%m-%dT%H:%M')
        
        if stat == '':
            stat = Order.OrderStatus.values
            context['pass_stat'] = ''
        else:
            stat = [int(stat)]
            context['pass_stat'] = Order.OrderStatus.choices[stat[0]][1]

        if user == '':
            items = Order.objects.filter(deleted=False, status__in=stat, ordered_at__range=(ord_after, ord_before)).order_by('-ordered_at')
        else:
            if get_user_model().objects.filter(username = user).exists():
                items = Order.objects.filter(deleted=False, status__in=stat, user = EcomUser.objects.get(user = get_user_model().objects.get(username = user)), ordered_at__range=(ord_after, ord_before)).order_by('-ordered_at')
            else:
                items = { }
    except (ValueError, ValidationError) as e:
        traceback.print_exc()
        items = { }
    
    context['pass_user'] = user

    # Display order page
    if items:
        paginator = Paginator(items, ORDERS_PER_PAGE)
        page = paginator.get_page(page)
        pages = give_pages(paginator, page)
        context['paginator'] = paginator
        context['page'] = page
        context['pages'] = pages
        context['items'] = page.object_list
    
    statuses = { }

    for orderstatus in Order.OrderStatus.choices:
        statuses[orderstatus[0]] = orderstatus[1]
            
    context['statuses'] = statuses
    context['selected'] = 'orders'
    return render(request, 'admin1/orders.html', context)

@admin_only
@has_permission('products.create')
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
@has_permission('products.delete')
def adminDelProduct(request):
    ids = request.POST.getlist('id')

    for id in ids:
        Product.objects.filter(deleted=False, hide = False, id = id).ecom_delete()
    
    messages.success(request, 'product_deleted')
    return redirect('adminProducts')

@admin_only
@has_permission('orders.create')
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
        try:
            orderQtyRem(order)
        except NotEnoughQuantityException:
            messages.error(request, 'order_not_enough_qty')
            return redirect('adminOrders')
    
    order.price = order.get_total()
    
    messages.success(request, 'order_created')
    return redirect('adminOrders')

@admin_only
@has_permission('orders.delete')
def adminDelOrder(request):
    ids = request.POST.getlist('id')

    for id in ids:
        order = Order.objects.filter(deleted=False, id = id)

        if order.exists():
            orderQtyAdd(order[0])
            order[0].ecom_delete()
    
    messages.success(request, 'order_deleted')
    return redirect('adminOrders')

## IMPORTANT: Price of the order is not changed, if items are changed !!!
@admin_only
@has_permission('orders.update')
def adminEditOrder(request, orderid):
    if request.method == 'GET':
        statuses = { }

        for orderstatus in Order.OrderStatus.choices:
            statuses[orderstatus[0]] = orderstatus[1]

        context = {
            'order': Order.objects.get(id = orderid, deleted = False),
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
            orderItem, created = order.items.create(product = Product.objects.get(id = product), quantity = quantity)
        
        order.user = EcomUser.objects.get(user = get_user_model().objects.get(username = user))
        order.status = int(status)
        # order.ordered_at = timezone.make_aware(datetime.strptime(ordered_at, "%Y-%m-%dT%H:%M")) -> Don't update the time

        order.save()

        orderQtyRem(order)

        messages.success(request, 'order_edited')
        return redirect('adminOrders')

@admin_only
@has_permission('products.update')
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
@has_permission('categories.delete')
def adminRemoveCat(request):
    id = request.POST.get('id', '')
    cat = Category.objects.filter(deleted=False, id=id)

    if(cat.exists()):
        cat.ecom_delete()
    
    return redirect('adminProducts')

@admin_only
@has_permission('categories.create')
def adminAddCat(request):
    name = request.POST.get('name', '')
    image = request.POST.get('image', '')
    cat = Category.objects.filter(deleted=False, name = name)

    if(not cat.exists()):
        Category.objects.create(name = name, image_css = image)
    
    return redirect('adminProducts')

@admin_only
def adminAccounts(request):
    return adminAccountsPage(request, 1)

@admin_only
@has_permission('accounts.read')
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
            context['pass_staff'] = 'on'
        if active == 'on':
            active = [True]
            context['pass_active'] = 'on'
        
        # TODO: Bug -> accounts id will be the same for some users, because id of ecom_staff could be the same as ecom_user
        ecom_users = EcomUser.objects.filter(deleted=False, user__username__icontains = user,
        user__email__icontains = email, user__is_staff__in = staff, user__is_active__in = active,
        country__icontains = country) \
        .values('user__username', 'user__email', 'user__is_staff', 'user__first_name','user__last_name', 'user__id', 'country', 'created_at').order_by('-user__date_joined')
        
        staff_users = EcomStaff.objects.filter(deleted=False, user__username__icontains = user,
        user__email__icontains = email, user__is_staff__in = staff, user__is_active__in = active) \
        .annotate(country=Value("NULL", CharField())) \
        .values('user__username', 'user__email', 'user__is_staff', 'user__first_name','user__last_name', 'user__id', 'country', 'created_at') \
        .order_by('-user__date_joined')

        logger.debug(staff_users.query)

        items = ecom_users.union(staff_users)

    except (ValueError, ValidationError) as e:
        traceback.print_exc()
        items = { }
    
    # Display order page

    paginator = Paginator(items, ACCOUNTS_PER_PAGE)

    page = paginator.get_page(page)

    pages = give_pages(paginator, page)
    
    context['pass_user'] = user
    context['pass_email'] = email
    context['pass_country'] = country

    context['paginator'] = paginator
    context['page'] = page
    context['pages'] = pages
    context['items'] = page.object_list
    context['selected'] = 'accounts'
    context['countries'] = iso3166.countries
    return render(request, 'admin1/accounts.html', context)

@admin_only
def adminAccountsGet(request):
    # Get values
    user = request.GET['term']

    items = EcomUser.objects.filter(deleted = False, user__username__istartswith=user).values(value=F('user__username'))

    return JsonResponse(list(items), safe=False)

@admin_only
@has_permission('accounts.delete')
def adminDelAccount(request):
    ids = request.POST.getlist('id', '')

    for id in ids:
        ecom_user = EcomUser.objects.get(deleted=False, id=id)
        ecom_user.ecom_delete()
    
    messages.success(request, 'account_deleted')
    return redirect('adminAccounts')

@admin_only
@has_permission('accounts.create')
def adminAddAccount(request):
    username = request.POST.get('username', '')
    email = request.POST.get('email', '')
    first_name = request.POST.get('firstname', '')
    last_name = request.POST.get('lastname', '')
    password = request.POST.get('password', '')
    address = request.POST.get('address', '')
    country = request.POST.get('country', '')
    staff = request.POST.get('staff', '')

    users = User.objects.filter((Q(username = username) | Q(email = email)))
    if users:
        ecom_users = EcomUser.objects.filter(deleted = False, user = users.first())

        if ecom_users:
            messages.error(request, 'account_exists')
            return redirect('adminAccounts')
    
    if staff == 'on':
        staff = True
    else:
        staff = False

    user = User.objects.create_user(username, email, password)
    user.first_name = first_name
    user.last_name = last_name
    user.is_staff = staff
    user.save()

    if staff:
        EcomStaff.objects.create(user = user)
    else:
        EcomUser.objects.create(user = user, address = address, country = country, email_confirmed = True)
    
    messages.success(request, 'account_created')
    return redirect('adminAccounts')

@admin_only
@has_permission('accounts.update')
def adminEditAccount(request, accountid):
    if request.method == 'GET':
        context = {
            'user': get_user_model().objects.get(id=accountid),
            'roles': Role.objects.all(),
            'uroles': EcomStaffRole.objects.filter(user = EcomStaff.objects.get(id = accountid)),
            'selected': 'accounts',
        }

        return render(request, 'admin1/edit-account.html', context)
    elif request.method == 'POST':
        roles = request.POST.getlist('role')
        name = request.POST.get('name', '')
        email = request.POST.get('email', '')
        address = request.POST.get('address', '')
        country = request.POST.get('country', '')
        email_confirmed = request.POST.get('email_confirmed', '')
        
        user = get_user_model().objects.get(id = accountid)

        account.user.username = name
        account.user.email = email
        account.address = address
        account.country = country

        if email_confirmed == 'on':
            account.email_confirmed = True
        else:
            account.email_confirmed = False
        
        account.save()
        account.user.save()

        # Update the roles
        EcomStaffRole.objects.filter(user = EcomStaff.objects.get(id=accountid)).delete()

        for role in roles:
            EcomStaffRole.objects.get_or_create(user = EcomStaff.objects.get(id=accountid), role = Role.objects.get(id = role))

        messages.success(request, 'account_edited')
        return redirect('adminAccounts')

@admin_only
@has_permission('report.read')
def adminReport(request):
    return adminReportPage(request, 1)

@admin_only
@has_permission('report.read')
def adminReportPage(request, page):
    context = { }
    statuses = { }
    REPORTS_PER_PAGE = 20

    ord_after = request.GET.get('ord-after', '0')
    ord_before = request.GET.get('ord-before', '0')
    groupby = request.GET.get('timegroup', '')

    try:
        if(ord_after == '0'):
            ord_after = timezone.make_aware(datetime.fromisoformat('2000-01-01'))
            context['pass_order_after'] = ''
        else:
            ord_after = timezone.make_aware(datetime.strptime(ord_after, '%Y-%m-%dT%H:%M'))
            context['pass_order_after'] = ord_after.strftime('%Y-%m-%dT%H:%M')
        if(ord_before == '0'):
            ord_before = timezone.make_aware(datetime.now())
            context['pass_order_before'] = ''
        else:
            ord_before = timezone.make_aware(datetime.strptime(ord_before, '%Y-%m-%dT%H:%M'))
            context['pass_order_before'] = ord_before.strftime('%Y-%m-%dT%H:%M')
        
        if groupby == '':
            groupby = 'month'
        elif groupby == '0':
            groupby = 'day'
        elif groupby == '1':
            groupby = 'week'
        elif groupby == '2':
            groupby = 'month'
        elif groupby == '3':
            groupby = 'year'
    except Exception as e:
        traceback.print_exc()
        items = { }

    for orderstatus in Order.OrderStatus.choices:
        statuses[orderstatus[0]] = orderstatus[1]
    
    paginator, pages, items = report_items(REPORTS_PER_PAGE, groupby, ord_before, ord_after, page)
    
    context['pass_timegroup'] = groupby
    context['paginator'] = paginator
    context['page'] = page
    context['pages'] = pages
    context['items'] = items
    context['statuses'] = statuses
    context['selected'] = 'report'

    return render(request, 'admin1/report.html', context)

@admin_only
@has_permission('report.read')
def adminReportExcel(request):
    ord_after = request.GET.get('ord-after', '0')
    ord_before = request.GET.get('ord-before', '0')
    groupby = request.GET.get('timegroup', '')

    try:
        if(ord_after == '0'):
            ord_after = timezone.make_aware(datetime.fromisoformat('2000-01-01'))
        else:
            ord_after = timezone.make_aware(datetime.strptime(ord_after, '%Y-%m-%dT%H:%M'))
        if(ord_before == '0'):
            ord_before = timezone.make_aware(datetime.now())
        else:
            ord_before = timezone.make_aware(datetime.strptime(ord_before, '%Y-%m-%dT%H:%M'))
        
        if groupby == '':
            groupby = 'month'
        elif groupby == '0':
            groupby = 'day'
        elif groupby == '1':
            groupby = 'week'
        elif groupby == '2':
            groupby = 'month'
        elif groupby == '3':
            groupby = 'year'
    except Exception as e:
        traceback.print_exc()
        return None
    
    paginator, pages, items = report_items(-1, groupby, ord_before, ord_after, 1)

    f = NamedTemporaryFile(delete=True, mode='w+')

    f.write("timestamp,orders,products,total_price\n")
    f.flush()
    
    for item in items:
        f.write(
            "" + item['start_day'].strftime('%Y-%m-%dT%H:%M') + "," +
            str(item['orders']) + "," + str(item['products']) + "," +
            str(item['total_price']) + "\n"
        )
        f.flush()

    response = HttpResponse(open(f.name, mode='r').read(), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename='+datetime.now().strftime("%Y-%m-%d_%H:%M.csv")

    return response
    #return render_to_csv_response(items, filename="report_" + timezone.make_aware(datetime.now()).strftime('%Y%m%d%H:%M'))

@admin_only
def adminRoles(request):
    return adminRolesPage(request, 1)

@admin_only
@has_permission('roles.read')
def adminRolesPage(request, page):
    context = { }
    items = Role.objects.filter(deleted = False)
    ROLES_PER_PAGE = 20
    
    # Display order page

    paginator = Paginator(items, ROLES_PER_PAGE)

    page = paginator.get_page(page)

    pages = give_pages(paginator, page)

    context['paginator'] = paginator
    context['page'] = page
    context['pages'] = pages
    context['items'] = page.object_list
    context['selected'] = 'roles'
    return render(request, 'admin1/roles.html', context)

@admin_only
@has_permission('roles.create')
def adminAddRole(request):
    role = request.POST.get('role', '')
    permissions = request.POST.getlist('permissions[]', '')

    if Role.objects.filter(deleted = False, name = role).exists():
        messages.error(request, 'role_exists')
        return redirect('adminRoles')
    
    role, create = Role.objects.get_or_create(name = role)

    # If the role existed before, the permissions should be removed
    role.permissions.clear()

    for perm in permissions:
        role.permissions.add(Permission.objects.get(deleted = False, id = perm))
    
    role.deleted = False
    role.save()
    
    messages.success(request, 'role_created')
    return redirect('adminRoles')

@admin_only
@has_permission('roles.delete')
def adminRemoveRole(request):
    ids = request.POST.getlist('id', '')

    for id in ids:
        role = Role.objects.get(deleted=False, id=id)
        role.ecom_delete()
    
    messages.success(request, 'role_deleted')
    return redirect('adminRoles')

@admin_only
@has_permission('roles.update')
def adminEditRole(request, roleid):
    if request.method == 'GET':
        context = {
            'role': Role.objects.get(deleted = False, id=roleid),
            'selected': 'roles',
        }

        return render(request, 'admin1/edit-role.html', context)
    elif request.method == 'POST':
        permissions = request.POST.getlist('permissions')
        
        role = Role.objects.get(id = roleid)

        role.permissions.clear()
        for perm in permissions:
            role.permissions.add(Permission.objects.get(id = perm))

        messages.success(request, 'role_edited')
        return redirect('adminRoles')

@admin_only
def adminPermissionsGet(request):
    # Get values
    perm = request.GET['term']

    items = Permission.objects.filter(deleted = False, name__istartswith=perm).values('id', value=F('name'))

    return JsonResponse(list(items), safe=False)