import requests, random, os, logging, traceback
from lxml import html
from ecom.models import Category, Product
from ecommerce.settings import MEDIA_ROOT
from multiprocessing.dummy import Pool as ThreadPool
import time
from faker import Faker

logging.getLogger('faker').setLevel(logging.ERROR)
logger = logging.getLogger(__name__)

fake = Faker()
# http://www.networkinghowtos.com/howto/common-user-agent-list/
HEADERS = ({'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'})

def createProduct(datas):
    try:
        data = datas[0]
        #tree = datas[1]
        image = datas[1]
        
        # Check if image is recieved, if not don't make product
        try:
            image.raise_for_status()
        except:
            return

        price = data['price']
        if price == "":
            price = float(random.randrange(2 * 100, 100 * 100) / 100)
        else:
            price = float(price)
        
        product, created = Product.objects.get_or_create(
            #name = str(tree.xpath('//*[@id="productTitle"]')[0].text_content()).replace('\n', ''),
            name = fake.bothify(text='?????? ????? ?????'),
            price = price,
            discount_price = price,
            category = Category.objects.get(pk=random.choice([1,2,3,4,6])),
            #description = str(tree.xpath('//*[@id="productDescription"]')[0].text_content()).replace('\n', ''),
            description = fake.text(),
            quantity = random.randint(10,100),
            hide = False,
            deleted = False
        )

        try:
            os.mkdir(os.path.join(MEDIA_ROOT, 'id'+str(product.id)))
        except:
            pass

        # save the uploaded file inside that folder.
        full_filename = os.path.join(MEDIA_ROOT, 'id'+str(product.id), 'image.jpg')
        with open(full_filename, 'wb+') as fout:
            fout.write(image.content)
            fout.close()

        product.image = 'id'+str(product.id) + os.sep + 'image.jpg'
        product.save()
    except:
        traceback.print_exc()
        return

def nameGenerator(n):
    for i in range(n):
        responce = requests.get('https://randomazonbackend.appspot.com/product/', headers=HEADERS)
        data = responce.json()
        asin = data['ASIN']
        # prodRes = requests.get('https://amazon.co.uk/dp/' + asin, headers=HEADERS)
        #tree = html.fromstring(prodRes.content)
        image = requests.get('https://ws-eu.amazon-adsystem.com/widgets/q?_encoding=UTF8&MarketPlace=GB&ASIN='+asin+'&ServiceVersion=20070822&ID=AsinImage&WS=1&Format=SL500', headers=HEADERS)
        yield data, image

def generateProducts(n = 10):
    threadPool = ThreadPool(processes = 4)

    threadPool.imap(createProduct, nameGenerator(n))
    threadPool.close()
    threadPool.join()

# generateProducts(50)