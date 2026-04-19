const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      email,
      phone,
      propertyAddress,
      listPrice,
      offerRangeMin,
      offerRangeMax,
      recommendedOffer,
      wantAgentMatch,
    } = req.body;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Offer Analysis',
              description: `Property: ${propertyAddress}`,
            },
            unit_amount: 500, // $5.00 in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        email,
        phone,
        propertyAddress,
        listPrice,
        offerRangeMin,
        offerRangeMax,
        recommendedOffer,
        wantAgentMatch,
      },
      success_url: `${process.env.VERCEL_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VERCEL_URL || 'http://localhost:3000'}/`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
}
