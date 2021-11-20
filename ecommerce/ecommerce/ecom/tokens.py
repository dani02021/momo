from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import base36_to_int, int_to_base36
from django.utils.crypto import constant_time_compare, salted_hmac
import ecommerce.settings as settings
import six

class AccountActivationTokenGenerator(PasswordResetTokenGenerator):
    def make_token(self, ecom_user):
        """
        Return a token that can be used once to do a password reset
        for the given user.
        """
        return self._make_token_with_timestamp(ecom_user, self._num_seconds(self._now()))
    
    def check_token(self, ecom_user, token):
        """
        Check that a password reset token is correct for a given user.
        """
        if not (ecom_user and token):
            return False
        # Parse the token
        try:
            ts_b36, _ = token.split("-")
        except ValueError:
            return False

        try:
            ts = base36_to_int(ts_b36)
        except ValueError:
            return False

        # Check that the timestamp/uid has not been tampered with
        if not constant_time_compare(self._make_token_with_timestamp(ecom_user, ts), token):
            return False

        # Check the timestamp is within limit.
        if (self._num_seconds(self._now()) - ts) > settings.PASSWORD_RESET_TIMEOUT:
            return False

        return True
    
    def _make_token_with_timestamp(self, ecom_user, timestamp):
        # timestamp is number of seconds since 2001-1-1. Converted to base 36,
        # this gives us a 6 digit string until about 2069.
        ts_b36 = int_to_base36(timestamp)
        hash_string = salted_hmac(
            self.key_salt,
            self._make_hash_value(ecom_user, timestamp),
            secret=self.secret,
            algorithm=self.algorithm,
        ).hexdigest()[::2]  # Limit to shorten the URL.
        return "%s-%s" % (ts_b36, hash_string)
    
    def _make_hash_value(self, ecom_user, timestamp):
        return (
            six.text_type(ecom_user.pk) + six.text_type(timestamp) +
            six.text_type(ecom_user.email_confirmed) +
            six.text_type(ecom_user.user.email)
        )

account_activation_token = AccountActivationTokenGenerator()