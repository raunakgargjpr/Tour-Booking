import '@babel/polyfill';
import { login, logout, signup } from './login';
import { displayMap } from './leaflet';
import { updateSettings, forgetPassword, resetPassword, postReview } from './updateSettings';
import { bookTour } from './stripe';

const leafletMap = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const signUpForm = document.getElementById("signform");

if (leafletMap) {
    const locations = JSON.parse(leafletMap.dataset.locations);
    displayMap(locations);
}

if (loginForm) {
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        login(email, password);
    });
};

if (signUpForm) {
    signUpForm.addEventListener('submit', async e => {
        e.preventDefault();
        const name = document.getElementById("name").value
        const password = document.getElementById("password").value
        const passwordConfirm = document.getElementById("passwordConfirm").value
        const email = document.getElementById("email").value
        await signup({ name, password, passwordConfirm, email });
    });
}

if (logOutBtn) {
    logOutBtn.addEventListener('click', logout);
}

if (userDataForm) {
    userDataForm.addEventListener('submit', e => {
        e.preventDefault();
        const form = new FormData();
        form.append('name', document.getElementById('name').value);
        form.append('email', document.getElementById('email').value);
        form.append('photo', document.getElementById('photo').files[0]);
        updateSettings(form, 'data');
    });
}

if (userPasswordForm) {
    userPasswordForm.addEventListener('submit', async e => {
        e.preventDefault();
        document.querySelector('.btn--save-password').textContent = 'Updating...';

        const passwordCurrent = document.getElementById('password-current').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        await updateSettings(
            { passwordCurrent, password, passwordConfirm },
            'password'
        );

        document.querySelector('.btn--save-password').textContent = 'Save password';
        document.getElementById('password-current').value = '';
        document.getElementById('password').value = '';
        document.getElementById('password-confirm').value = '';
    });
}

const bookBtn = document.getElementById('book-tour');

if (bookBtn) {
    bookBtn.addEventListener('click', e => {
        e.target.textContent = 'Processing...';
        const tourId = e.target.dataset.tourid;
        bookTour(tourId);
    });
}

const forgetPassForm = document.getElementById("forgetPassForm")
// console.log(forgetPassForm)
if (forgetPassForm) {
    // console.log('hello')
    let email = document.getElementById("email")
    forgetPassForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        email = email.value;
        await forgetPassword(email);
    })
}

const resetPasswordForm = document.getElementById("resetPasswordForm")
if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const password = document.getElementById("password").value;
        const passwordConfirm = document.getElementById("confirmPassword").value;
        const token = e.target.dataset.token;
        //    console.log(password,passwordConfirm)
        await resetPassword({ password, passwordConfirm }, token);
    })
}

const reviewForm = document.getElementById("reviewForm")
reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tourId = e.target.dataset.tourid;
    const review = document.getElementById("userReview").value;
    const rating = document.getElementById("rating").value;
    await postReview({ rating, review, tourId });
})