from django.conf.urls import url
from django.contrib.auth import logout
from django.urls import path

from ecom import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login, name='login'),
    path('register/', views.register, name='register'),
    path('logout/', views.logout, name='logout'),
    path('products/', views.products, name='products'),
    path('products/<int:page>/', views.productsPage, name='productsPage'),
    path('product-detail/<int:id>/', views.productDetail, name='productDetail'),
    path('my-account/', views.myAccount, name='my-account'),
    path('add-to-cart/', views.addToCart, name='add-to-cart'),
    path('remove-from-cart/', views.removeFromCart, name='remove-from-cart'),
    path('cart/', views.cart, name='cart'),
    path('capture-order/', views.captureOrder, name='captureOrder'),
    path('checkout/', views.checkout, name='checkout'),
    path('administration/', views.administration, name='administration'),
    path('administration/report/', views.adminReport, name='adminReport'),
    path('administration/report/<int:page>/', views.adminReportPage, name='adminReportPage'),
    path('administration/report/excel/', views.adminReportExcel, name='adminReportExcel'),
    path('administration/products/', views.adminProducts, name='adminProducts'),
    path('administration/products/add/', views.adminAddProduct, name='adminAddProduct'),
    path('administration/products/del/', views.adminDelProduct, name='adminDelProduct'),
    path('administration/products/<int:page>/', views.adminProductsPage, name='adminProductsPage'),
    path('administration/products/edit/<int:productid>/', views.adminEditProduct, name='adminEditProduct'),
    path('administration/orders/', views.adminOrders, name='adminOrders'),
    path('administration/orders/<int:page>/', views.adminOrdersPage, name='adminOrdersPage'),
    path('administration/orders/add/', views.adminAddOrder, name='adminAddOrder'),
    path('administration/orders/del/', views.adminDelOrder, name='adminDelOrder'),
    path('administration/orders/edit/<int:orderid>/', views.adminEditOrder, name='adminEditOrder'),
    path('administration/products/remove-cat/', views.adminRemoveCat, name='adminRemoveCat'),
    path('administration/products/add-cat/', views.adminAddCat, name='adminAddCat'),
    path('administration/accounts/', views.adminAccounts, name='adminAccounts'),
    path('administration/accounts/<int:page>/', views.adminAccountsPage, name='adminAccountsPage'),
    url(r'^activate_account/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,50})/$',
            views.activateAccount, name='activateAccount'),
    url(r'^email-resend/(?P<uidb64>[0-9A-Za-z_\-]+)', views.emailResend, name='emailResend'),
]