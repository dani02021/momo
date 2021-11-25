import requests, random
from lxml import html
from ecom.models import Category, Product

def nameGenerator(n = 10):
    for i in range(n-1):
        responce = requests.get('https://randomazonbackend.appspot.com/product/')
        data = responce.json()
        asin = data['ASIN']
        prodRes = requests.get('https://amazon.co.uk/dp/' + asin)
        tree = html.fromstring(prodRes.content)
        image = requests.get('https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&MarketPlace=US&ASIN='+asin+'&ServiceVersion=20070822&ID=AsinImage&WS=1&Format=SL500').content
        yield data, tree, image

def generateProducts(request):
    names = nameGenerator()

    for data, tree, image in names:
        price = data[price]
        if price == "":
            price = float(random.randrange(5 * 100, 100 * 100) / 100)
        else:
            price = float(price)
        prod = Product.objects.get_or_create(
            name = tree.xpath('//*[@id="productTitle"]/text()')[0],
            price = price,
            discount_price = price,
            category = Category.objects.get(pk=random.randint(0,4))
            description = 
        )
    name = models.CharField(max_length=100, unique=True)
    price = models.DecimalField(max_digits=7, decimal_places=2) # Max price: 99999.99
    discount_price = models.DecimalField(max_digits=7, decimal_places=2) # Max price: 99999.99
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField()
    image = models.ImageField(blank = True, null = True)
    quantity = models.IntegerField(default=1)
    hide = models.BooleanField(default=False)