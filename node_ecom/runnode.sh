npm -use_strict start > >(ts '[%Y-%m-%d %H:%M:%S]' | tee -a /var/log/ecom_nodejs/access.log)  2> >(ts '[%Y-%m-%d %H:%M:%S]' | tee -a /var/log/ecom_nodejs/error.log >&2)
