const Stripe = require('stripe');
const sgMail = require('@sendgrid/mail');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { email, phone, propertyAddress, offerRangeMin, offerRangeMax, wantAgentMatch } = session.metadata || {};

    if (wantAgentMatch === 'true') {
      try {
        const msg = {
          to: process.env.YOUR_EMAIL,
          from: 'noreply@offeranalysis.io',
          subject: `New Agent Referral Lead: ${propertyAddress}`,
          html: `
            <h2>New Referral Lead</h2>
            <p><strong>Property:</strong> ${propertyAddress}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Offer Range:</strong> $${offerRangeMin} - $${offerRangeMax}</p>
            <p><strong>Payment ID:</strong> ${session.id}</p>
            <p>Contact this buyer to discuss representation.</p>
          `,
        };

        await sgMail.send(msg);
        console.log(`Referral email sent for ${propertyAddress}`);
      } catch (error) {
        console.error(`Error sending email: ${error.message}`);
        return res.status(200).json({ received: true, emailError: error.message });
      }
    }
  }

  res.status(200).json({ received: true });
}
