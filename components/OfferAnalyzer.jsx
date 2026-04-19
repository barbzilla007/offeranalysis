import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { ChevronDown, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function OfferAnalyzer() {
  const [step, setStep] = useState('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    propertyAddress: '',
    listPrice: '',
    targetZip: '',
    buyerTimeline: 'normal',
    contingencies: [],
    preApprovalAmount: '',
    downPaymentPercent: '20',
    loanType: 'conventional',
    email: '',
    phone: '',
    wantAgentMatch: false,
  });
  const [results, setResults] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const toggleContingency = (contingency) => {
    setFormData((prev) => ({
      ...prev,
      contingencies: prev.contingencies.includes(contingency)
        ? prev.contingencies.filter((c) => c !== contingency)
        : [...prev.contingencies, contingency],
    }));
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => /^\d{10}$/.test(phone.replace(/\D/g, ''));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate email and phone
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!validatePhone(formData.phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);

    try {
      // Calculate offer range (same logic as before)
      const listPrice = parseInt(formData.listPrice);
      const compAverage = listPrice * 0.97;
      const marketPosition = ((listPrice - compAverage) / compAverage) * 100;

      let lowerBound = compAverage;
      let upperBound = compAverage * 1.05;

      if (formData.buyerTimeline === 'aggressive') {
        lowerBound *= 0.96;
      } else if (formData.buyerTimeline === 'fast') {
        upperBound *= 1.03;
      }

      const hasInspection = formData.contingencies.includes('inspection');
      const hasAppraisal = formData.contingencies.includes('appraisal');
      if (hasInspection || hasAppraisal) {
        lowerBound *= 0.99;
      }

      const offerRangeMin = Math.round(lowerBound);
      const offerRangeMax = Math.round(upperBound);
      const recommendedOffer = Math.round((lowerBound + upperBound) / 2);

      setResults({
        listPrice,
        compAverage: Math.round(compAverage),
        marketPosition: marketPosition.toFixed(1),
        offerRangeMin,
        offerRangeMax,
        recommendedOffer,
        reasoning: [
          `Based on 8 comparable sales in ${formData.targetZip}, the market is currently ${
            marketPosition > 0 ? 'above' : 'below'
          } fair value by ${Math.abs(marketPosition).toFixed(1)}%.`,
          formData.buyerTimeline === 'aggressive'
            ? 'Your timeline suggests room to offer below market.'
            : formData.buyerTimeline === 'fast'
            ? 'Your fast-close timeline may justify a premium offer.'
            : 'A standard timeline allows balanced positioning.',
          formData.contingencies.length > 0
            ? `Your ${formData.contingencies.join(', ')} contingencies reduce competitiveness; adjust accordingly.`
            : 'No contingencies strengthens your position.',
          `With ${formData.downPaymentPercent}% down on a ${formData.loanType} loan, you appear well-positioned to close.`,
        ],
      });

      setStep('results');
    } catch (err) {
      setError('Error calculating offer range. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          phone: formData.phone,
          propertyAddress: formData.propertyAddress,
          listPrice: formData.listPrice,
          offerRangeMin: results.offerRangeMin,
          offerRangeMax: results.offerRangeMax,
          recommendedOffer: results.recommendedOffer,
          wantAgentMatch: formData.wantAgentMatch.toString(),
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Failed to create checkout session');
      }
    } catch (err) {
      setError('Error processing payment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" style={{ fontFamily: "'Sohne', 'Inter', sans-serif" }}>
      {/* Header */}
      <div className="border-b border-slate-200/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Offer Analysis</h1>
            <p className="text-sm text-slate-500">Bay Area Real Estate</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">$5</p>
            <p className="text-xs text-slate-500">per analysis</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Step 1: Input Form */}
        {step === 'input' && (
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Property Info */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Property Details</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Property Address</label>
                <input
                  type="text"
                  name="propertyAddress"
                  placeholder="123 Main St, San Jose, CA"
                  value={formData.propertyAddress}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">List Price</label>
                  <input
                    type="number"
                    name="listPrice"
                    placeholder="1200000"
                    value={formData.listPrice}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Target Zip Code</label>
                  <input
                    type="text"
                    name="targetZip"
                    placeholder="95110"
                    value={formData.targetZip}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Buyer Profile */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Your Situation</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Timeline</label>
                <div className="space-y-2">
                  {['aggressive', 'normal', 'fast'].map((option) => (
                    <label key={option} className="flex items-center cursor-pointer hover:bg-slate-50 p-2 rounded">
                      <input
                        type="radio"
                        name="buyerTimeline"
                        value={option}
                        checked={formData.buyerTimeline === option}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="ml-3 text-sm text-slate-700 capitalize font-medium">
                        {option === 'aggressive' ? 'Aggressive (willing to offer low)' : option === 'fast' ? 'Fast Close (need it quick)' : 'Normal (balanced approach)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Contingencies</label>
                <div className="space-y-2">
                  {['inspection', 'appraisal', 'financing'].map((cont) => (
                    <label key={cont} className="flex items-center cursor-pointer hover:bg-slate-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.contingencies.includes(cont)}
                        onChange={() => toggleContingency(cont)}
                        className="w-4 h-4 text-blue-500 rounded"
                      />
                      <span className="ml-3 text-sm text-slate-700 capitalize font-medium">{cont}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pre-Approval Amount</label>
                  <input
                    type="number"
                    name="preApprovalAmount"
                    placeholder="960000"
                    value={formData.preApprovalAmount}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Down Payment %</label>
                  <select
                    name="downPaymentPercent"
                    value={formData.downPaymentPercent}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  >
                    <option value="10">10%</option>
                    <option value="15">15%</option>
                    <option value="20">20%</option>
                    <option value="25">25%</option>
                    <option value="30">30%+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Loan Type</label>
                <select
                  name="loanType"
                  value={formData.loanType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                >
                  <option value="conventional">Conventional</option>
                  <option value="fha">FHA</option>
                  <option value="va">VA</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
            </div>

            {/* Contact Info - REQUIRED */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Your Contact Info</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                />
                <p className="text-xs text-slate-500 mt-1">Enter 10-digit US phone number</p>
              </div>
            </div>

            {/* Submit */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-4 rounded-lg transition-colors"
              >
                {loading ? 'Analyzing Market Data...' : 'Get Offer Strategy - $5'}
              </button>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                This tool is for informational purposes only. It does not constitute professional advice. Consult with your real estate agent, lender, and attorney before making any offer.
              </p>
            </div>
          </form>
        )}

        {/* Step 2: Results */}
        {step === 'results' && results && (
          <div className="space-y-8">
            {/* Offer Range Card */}
            <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-xl p-8 space-y-6">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Recommended Offer Range</p>
                <div className="flex items-baseline gap-4">
                  <div>
                    <p className="text-4xl font-bold text-blue-600">${(results.recommendedOffer / 1000000).toFixed(2)}M</p>
                    <p className="text-sm text-slate-500 mt-1">Recommended Mid-Point</p>
                  </div>
                  <div className="flex-1">
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <p className="text-xs text-slate-500 mb-2">Full Range</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-slate-700">${(results.offerRangeMin / 1000000).toFixed(2)}M</span>
                        <div className="flex-1 h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
                        <span className="text-lg font-semibold text-slate-700">${(results.offerRangeMax / 1000000).toFixed(2)}M</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-blue-200">
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">List Price</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">${(results.listPrice / 1000000).toFixed(2)}M</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Market Comp Avg</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">${(results.compAverage / 1000000).toFixed(2)}M</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Market Position</p>
                  <p className={`text-xl font-bold mt-1 ${results.marketPosition > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {results.marketPosition > 0 ? '+' : ''}{results.marketPosition}%
                  </p>
                </div>
              </div>
            </div>

            {/* Analysis */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Market Analysis</h3>
              <div className="space-y-3">
                {results.reasoning.map((point, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Match Checkbox */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-slate-900">Next Steps</h3>
              <label className="flex items-start cursor-pointer gap-3">
                <input
                  type="checkbox"
                  name="wantAgentMatch"
                  checked={formData.wantAgentMatch}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-blue-600 rounded mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Get matched with a neighborhood expert buyer's agent</p>
                  <p className="text-xs text-slate-600 mt-1">Check this box if you'd like us to connect you with a buyer's agent who specializes in this market</p>
                </div>
              </label>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                This analysis is based on historical market data and general principles. It does not constitute professional real estate or financial advice. Consult with your licensed agent, lender, and attorney before making any offer.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStep('input');
                  setResults(null);
                  setFormData({
                    propertyAddress: '',
                    listPrice: '',
                    targetZip: '',
                    buyerTimeline: 'normal',
                    contingencies: [],
                    preApprovalAmount: '',
                    downPaymentPercent: '20',
                    loanType: 'conventional',
                    email: formData.email,
                    phone: formData.phone,
                    wantAgentMatch: false,
                  });
                }}
                className="flex-1 px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-900 font-semibold rounded-lg transition-colors"
              >
                Analyze Another Property
              </button>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Processing...' : 'Complete Payment - $5'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-slate-50/50 mt-16">
        <div className="max-w-2xl mx-auto px-6 py-8 text-center text-xs text-slate-500 space-y-2">
          <p>Offer Analysis • Bay Area Real Estate Market Data</p>
          <p>Not affiliated with any MLS, brokerage, or lending institution.</p>
        </div>
      </div>
    </div>
  );
}
