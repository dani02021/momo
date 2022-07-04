npm start > >(tee -a /var/log/ecom_nodejs/stdout2.txt)  2> >(tee -a /var/log/ecom_nodejs/stderr2.txt >&2)
