from django.contrib import messages
from django.shortcuts import redirect, render
from django.test import TestCase

from ecom.models import EcomUser
from ecom.utils import has_role_permission

def admin_only(view_func):
    def wrap(request, *args, **kwargs):
        if request.user.is_staff:
            return view_func(request, *args, **kwargs)
        else:
            messages.error(request, 'no_staff')
            return render(request, 'admin1/login/index.html')
    return wrap

def has_permission(perm):
    def _method_wrapper(view_method):
        def _arguments_wrapper(request, *args, **kwargs) :
            user = EcomUser.objects.get(user = request.user)
            if has_role_permission(user.get_role_display(), perm):
                return view_method(request, *args, **kwargs)
            else:
                messages.error(request, 'no_permission')
                return redirect('administration')
        return _arguments_wrapper
    return _method_wrapper