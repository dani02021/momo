from django.contrib import admin
from django.contrib.admin.decorators import register
from .models import Category, EcomUser, Variation, ProductImage, Product, Order, OrderItem

# Register your models here.
class ProductImageAdmin(admin.StackedInline):
    model = ProductImage

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    inlines = [ProductImageAdmin]

    class Meta:
        model = Product

@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    pass

admin.site.register(EcomUser)
admin.site.register(Variation)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(Category)