from django.core.checks import messages
from django.shortcuts import redirect, render
from django.test import TestCase

def admin_only(view_func):
    def wrap(request, *args, **kwargs):
        if request.user.is_staff:
            return view_func(request, *args, **kwargs)
        else:
            messages.error(request, 'no_staff')
            return render(request, 'admin1/login/index.html')
    return wrap