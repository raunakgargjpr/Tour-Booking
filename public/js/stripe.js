import axios from 'axios';
import { showAlert } from './alert';

export const bookTour = async tourId => {
    const stripe = Stripe('pk_test_51ONaU0SEKhUNlMzeqkeswly9lVuVAOC5ZVfNthRkoZVuzWTpbRREEfbG3QJctQpw9eFc6vi6mXRxU3qoPZd2ft9700yJUVYT5p'); // <==== PUT THE VARIABLE HERE
    try {
        // 1. Get checkout session from the API
        const res = await axios(
            `/api/v1/bookings/checkout-session/${tourId}`
        );
        console.log(res);
 
        // 2. Create checkout form + charge credit card
        await stripe.redirectToCheckout({
            sessionId: res.data.session.id
        });
    } 
    catch (err) {
        console.log(err);
        showAlert('error', err);
    }
};