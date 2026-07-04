import re

from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from .models import Contact, UserProfile


class ContactForm(forms.Form):
    fullName = forms.CharField(max_length=150, label="Full Name")
    emailAddress = forms.EmailField(label="Email Address")
    phoneNumber = forms.CharField(max_length=20, required=False, label="Phone Number")
    subject = forms.ChoiceField(
        choices=[("", "Select a topic")] + Contact.SUBJECT_CHOICES,
        required=False,
    )
    message = forms.CharField(widget=forms.Textarea, label="Message")


def generate_unique_username(email):
    base = re.sub(r"[^\w.@+-]", "", email.split("@")[0]) or "user"
    username = base
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base}{counter}"
        counter += 1
    return username


class RegisterForm(forms.Form):
    fullName = forms.CharField(max_length=150, label="Full Name")
    email = forms.EmailField(label="Email Address")
    mobile = forms.CharField(max_length=15, label="Mobile Number")
    password = forms.CharField(widget=forms.PasswordInput, label="Password")

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("An account with this email already exists.")
        return email

    def clean_mobile(self):
        mobile = self.cleaned_data["mobile"].strip()
        if UserProfile.objects.filter(mobile_number=mobile).exists():
            raise forms.ValidationError("An account with this mobile number already exists.")
        return mobile

    def save(self):
        full_name = self.cleaned_data["fullName"].strip()
        name_parts = full_name.split(None, 1)
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        username = generate_unique_username(self.cleaned_data["email"])

        user = User.objects.create_user(
            username=username,
            email=self.cleaned_data["email"],
            password=self.cleaned_data["password"],
            first_name=first_name,
            last_name=last_name,
        )
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.mobile_number = self.cleaned_data["mobile"]
        profile.save()
        return user


class LoginForm(forms.Form):
    identifier = forms.CharField(label="Username or Email")
    password = forms.CharField(widget=forms.PasswordInput, label="Password")

    def clean(self):
        cleaned_data = super().clean()
        identifier = cleaned_data.get("identifier", "").strip()
        password = cleaned_data.get("password")

        if identifier and password:
            username = identifier
            if "@" in identifier:
                try:
                    username = User.objects.get(email__iexact=identifier).username
                except User.DoesNotExist:
                    username = identifier

            user = authenticate(username=username, password=password)
            if user is None:
                raise forms.ValidationError("Invalid username/email or password.")
            cleaned_data["user"] = user

        return cleaned_data
