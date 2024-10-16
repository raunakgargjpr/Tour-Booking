/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';

// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
    try {
        const url =
            type === 'password'
                ? '/api/v1/users/updateMyPassword'
                : '/api/v1/users/updateMe';

        const res = await axios({
            method: 'PATCH',
            url,
            data
        });

        if (res.data.status === 'success') {
            showAlert('success', `${type.toUpperCase()} updated successfully!`);
        }
    } catch (err) {
        showAlert('error', err.response.data.message);
    }
};

export const forgetPassword = async (email) => {
    try {
        const res = await axios({
            method: "POST",
            url: "/api/v1/users/forgotPasswordRender",
            data: {
                email
            }
        })
        if (res.data.status === "success") {
            showAlert('success', "Reset Link Sent to Email!")
            window.setTimeout(() => {
                location.assign('/');
            }, 1500);
        }
    }
    catch (err) {
        console.log(err)
        showAlert("error", err.response.data.message)
    }
}
export const resetPassword = async (passData, token) => {
    console.log('inside resetPassword updateSettings.js');
    try {
        const res = await axios({
            method: "PATCH",
            url: `/api/v1/users/resetPassword/${token}`,
            data: { ...passData }
        })
        if (res.data.status === "success") {
            showAlert('success', "Password Changed Successfully")
            window.setTimeout(() => {
                location.assign('/');
            }, 1500);
        }
    }
    catch (err) {
        console.log(err)
        showAlert("error", err.response.data.message);
    }
}

export const postReview = async (reviewObj) => {
    console.log('inside postReview updateSettings.js');
    try {
        const res = await axios({
            method: "POST",
            url: `/api/v1/tours/${reviewObj.tourId}/reviews`,
            data: {
                review: reviewObj.review,
                rating: reviewObj.rating
            }
        })
        if (res.data.status === "success") {
            showAlert('success', "Review Posted Successfully")
            window.setTimeout(() => {
                location.assign('/');
            }, 1500);
        }
    }
    catch (err) {
        console.log(err)
        showAlert("error", err.response.data.message);
    }
}
