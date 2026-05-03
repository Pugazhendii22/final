import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const RatingPage = () => {
  const { token } = useParams();
  const [ratingDoc, setRatingDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchRating = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'ratings', token));
        if (!docSnap.exists()) {
          setError('Invalid or expired link');
        } else {
          const data = docSnap.data();
          if (data.isUsed) {
            setSuccess(true);
          }
          setRatingDoc(data);
        }
      } catch (err) {
        console.error("Error fetching rating link:", err);
        setError('An error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchRating();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a star rating first.");
      return;
    }
    
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'ratings', token), {
        rating: rating,
        comment: comment,
        status: 'submitted',
        submittedAt: Timestamp.now(),
        isUsed: true
      });
      setSuccess(true);
    } catch (err) {
      console.error("Error submitting rating:", err);
      alert("Failed to submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-500 font-medium">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-slate-900 py-4 text-center">
          <h1 className="text-white text-xl font-bold tracking-wider">FRENCH MOBILES</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-gray-100">
            <div className="text-5xl mb-4">⭐</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank You!</h2>
            <p className="text-gray-600 leading-relaxed">
              {ratingDoc?.isUsed && !ratingDoc?.submittedAt ? "You have already submitted your rating. Thank you!" : "Thank you for your feedback!\nYour rating helps us serve you better."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 py-4 text-center">
        <h1 className="text-white text-xl font-bold tracking-wider">FRENCH MOBILES</h1>
      </header>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md overflow-hidden">
          <div className="bg-indigo-50 p-6 text-center border-b border-indigo-100">
            <h2 className="text-xl font-bold text-indigo-900 mb-1">How was your experience?</h2>
            <p className="text-indigo-700 text-sm">Service for {ratingDoc.brand} {ratingDoc.model}</p>
            {ratingDoc.technicianName && (
              <p className="text-indigo-500 text-xs mt-1">Serviced by {ratingDoc.technicianName}</p>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="mb-8 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <svg 
                    className={`w-12 h-12 ${star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-200'}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
            
            <div className="mb-6">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us about your experience (optional)"
                rows="4"
                className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none bg-gray-50 hover:bg-white transition-colors"
              ></textarea>
            </div>
            
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className={`w-full py-3.5 rounded-xl text-white font-bold text-lg transition-all ${
                rating === 0 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RatingPage;
