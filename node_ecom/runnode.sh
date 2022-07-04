npm start > >(ts '[%Y-%m-%d %H:%M:%S]' | tee -a /var/log/ecom_nodejs/stdout2.txt)  2> >(ts '[%Y-%m-%d %H:%M:%S]' | tee -a /var/log/ecom_nodejs/stderr2.txt >&2)
