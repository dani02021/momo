from bs4 import BeautifulSoup
import requests

soup = BeautifulSoup('https://www.randomlists.com/things?show_images=true&dup=false&qty=100', 'html.parser')

def generateProducts(request):
    
    name = models.CharField(max_length=100, unique=True)
    price = models.DecimalField(max_digits=7, decimal_places=2) # Max price: 99999.99
    discount_price = models.DecimalField(max_digits=7, decimal_places=2) # Max price: 99999.99
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField()
    image = models.ImageField(blank = True, null = True)
    quantity = models.IntegerField(default=1)
    hide = models.BooleanField(default=False)

def nameGenerator():
    responce = requests.get('https://randomazonbackend.appspot.com/product/')
    data = responce.json()
    asin = data['ASIN']
    image = requests.get('https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&MarketPlace=US&ASIN='+asin+'&ServiceVersion=20070822&ID=AsinImage&WS=1&Format=SL500')

    with open(path, 'wb') as f:
        r.raw.decode_content = True
        shutil.copyfileobj(r.raw, f)
