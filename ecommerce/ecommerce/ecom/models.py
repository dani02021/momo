from django.db import models
from django.db.models.deletion import CASCADE
from django.db.models.enums import IntegerChoices
from django.db.models.expressions import F
from django.db.models.fields.files import ImageField
from django.utils.translation import gettext as _
from django.contrib.auth.models import User
from iso3166 import countries

from ecom.utils import product_delete_images, product_delete_variations

# Create your models here.

# Custom user
class EcomUser(models.Model):
    def __str__(self) -> str:
        return self.user.username
    def ecom_delete(self):
        self.deleted = True
        self.save()
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    address = models.CharField(max_length=200)
    country = models.CharField(max_length=100) # Would be better with IntegerField
    email_confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted = models.BooleanField()

class Category(models.Model):
    def __str__(self) -> str:
        return self.name
    def ecom_delete(self):
        self.deleted = True
        self.save()
    
    name = models.CharField(max_length=100)
    image_css = models.CharField(max_length=100)
    deleted = models.BooleanField()

class Product(models.Model):
    #
    # IMPORTANT:
    # Maybe I should add table for every product category ?
    #
    def __str__(self) -> str:
        return self.name
    def ecom_delete(self):
        self.deleted = True
        product_delete_images(self.id)
        product_delete_variations(self.id)
        self.save()
    
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    price = models.DecimalField(max_digits=7, decimal_places=2) # Max price: 99999.99
    discount_price = models.DecimalField(max_digits=7, decimal_places=2) # Max price: 99999.99
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField()
    image = models.ImageField(blank = True, null = True)
    quantity = models.IntegerField(default=1)
    hide = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted = models.BooleanField()

class OrderItem(models.Model):
    def __str__(self) -> str:
        return ' Order Item: ' + self.product.name
    def get_total(self):
        return self.product.discount_price * self.quantity
    def ecom_delete(self):
        self.deleted = True
        self.save()
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(default = 1)
    deleted = models.BooleanField()

class Order(models.Model):
    def __str__(self) -> str:
        return 'Order ID: ' + str(self.id)
    def get_items(self):
        return self.items.all()
    def get_items_count(self):
        return len(self.get_items())
    def get_total(self):
        return sum([item.get_total() for item in self.items.all()])
    def datetimeHTML(self):
        if self.ordered_at is None:
            return ''
        return self.ordered_at.strftime('%Y-%m-%dT%H:%M')
    def ecom_delete(self):
        self.deleted = True
        for item in self.items.all():
            item.ecom_delete(self)
        self.save()
    
    class OrderStatus(models.IntegerChoices):
        NOT_ORDERED = 0, _('Not Ordered')
        PENDING = 1, _('Pending')
        SHIPPED = 2, _('Shipped')
        REFUSED = 3, _('Refused')
        DECLINED = 4, _('Declined')
        COMPLETED = 5, _('Completed')

        # __empty__ = _('(Unknown)')
    
    id = models.BigAutoField(primary_key=True)
    items = models.ManyToManyField(OrderItem)
    user = models.ForeignKey(EcomUser, on_delete=models.DO_NOTHING)
    ordered_at = models.DateTimeField(blank=True, null=True)
    status = models.IntegerField(choices=OrderStatus.choices)
    deleted = models.BooleanField()

class OrderItemCookie(models.Model):
    def __str__(self) -> str:
        return super.__str__ + ' Order Item: ' + self.product.name
    
    product = models.OneToOneField(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()

class OrderCookie(models.Model):
    def __str__(self) -> str:
        return 'Order ID: ' + self.id
    class OrderStatus(models.IntegerChoices):
        PENDING = 0
        SHIPPED = 1
        REFUSED = 2
        DECLINE = 3
        COMPLETED = 4
    
    id = models.BigAutoField(primary_key=True)
    is_ordered = models.BooleanField(blank=False, null=False)
    items = models.ManyToManyField(OrderItem)
    user = models.UUIDField(editable=False)
    ordered_at = models.DateTimeField(blank=True, null=True)
    status = models.IntegerField(choices=OrderStatus.choices)

class ProductImage(models.Model):
    def __str__(self) -> str:
        return self.id
    
    product = models.ForeignKey(Product, default=None, on_delete=models.CASCADE)
    image = models.ImageField(blank = True, null = True)
    deleted = models.BooleanField()

class Variation(models.Model):
    def __str__(self) -> str:
        return self.tag + ': ' + self.tag_value + ' of ' + str(self.product.name)
    
    tag = models.CharField(max_length=50)
    tag_value = models.CharField(max_length=50)
    product = models.ForeignKey(Product, default=None, on_delete=models.CASCADE, related_name="product")
    variation = models.ForeignKey(Product, default=None, on_delete=models.CASCADE, related_name="variationProduct")
    deleted = models.BooleanField()

class PayPalTransaction(models.Model):
    def __str__(self) -> str:
        return super().__str__()
    
    timestamp = models.DateTimeField(auto_now_add=True)
    transaction_id = models.CharField(default='', null=False, max_length=50)
    paypal_request_id = models.UUIDField(null=False)
    status_code = models.CharField(default='', null=False, max_length=20)
    status = models.CharField(default='', null=False, max_length=255)
    email_address = models.CharField(default='', null=False, max_length=255)
    first_name = models.CharField(default='', null=False, max_length=255)
    last_name = models.CharField(default='', null=False, max_length=255)
    phone_number = models.CharField(default='', null=False, max_length=50)
    deleted = models.BooleanField()