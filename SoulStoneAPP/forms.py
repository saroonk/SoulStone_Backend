from django import forms

from .models import Contact


class ContactForm(forms.Form):
    fullName = forms.CharField(max_length=150, label="Full Name")
    emailAddress = forms.EmailField(label="Email Address")
    phoneNumber = forms.CharField(max_length=20, required=False, label="Phone Number")
    subject = forms.ChoiceField(
        choices=[("", "Select a topic")] + Contact.SUBJECT_CHOICES,
        required=False,
    )
    message = forms.CharField(widget=forms.Textarea, label="Message")
