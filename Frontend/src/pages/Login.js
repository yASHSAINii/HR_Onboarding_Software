import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import lottie from 'lottie-web';
import animationData from './bg.json';
import logoImg from './human.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [credential, setCredential] = useState('');
  const [role, setRole] = useState('candidate');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const lottieContainer = useRef(null);

  useEffect(() => {
    if (lottieContainer.current) {
      const anim = lottie.loadAnimation({
        container: lottieContainer.current,
        renderer: 'canvas',
        loop: true,
        autoplay: true,
        animationData: animationData,
      });
      return () => anim.destroy();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !credential) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const response = await login(email, credential, role);
      if (response.firstLogin === true) {
        navigate('/set-password');
      } else if (response.user) {
        if (response.user.role === 'recruiter') navigate('/app/dashboard');
        else if (response.user.role === 'candidate') navigate('/candidate/dashboard');
        else navigate('/dashboard');
      } else {
        setError('Unexpected response from server');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative flex items-center justify-center p-4 font-montserrat">

      <div ref={lottieContainer} className="absolute inset-0 opacity-45 pointer-events-none h-full w-full z-0" />

      {/* Header – absolute top, white background removed  */}
       <header className="absolute top-0 left-0 right-0 z-50">
        <nav className="flex items-center justify-between py-2 px-6 lg:px-8">
          <div className="flex items-center flex-1">
            <Link to="/" className="-m-1.5 p-1.5">
              <img src={logoImg} alt="DayZero Logo" className="h-10 w-auto border border-white rounded-3xl bg-white" />
            </Link>
            <div className="pt-1 pl-3 pr-3 text-2xl text-black font-bowlby">
              Day <span className="text-indigo-600 font-bowlby">Zero</span>
            </div>
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center">
            <Link to="/" className="text-black font-semibold py-1 px-5 no-underline hover:underline">
              Home
            </Link>
            <div className="">
              <Link to="/login" className="border border-indigo-600 px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 font-semibold text-white py-1">
                Log in →
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Login Card – white bg, border, shadow, hover lift */}
      <div className="relative z-10 w-full max-w-[500px] bg-white rounded-lg border border-slate-300 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl p-6 md:p-8">
        {/* Card Header */}
        <div className="w-full mb-4">
          <div className="text-center mb-2">
            <img src="/human.png" alt="DayZero Logo Large" className="max-w-[60px] h-auto inline-block" />
          </div>
          <h2 className="font-montserrat text-3xl md:text-4xl font-semibold tracking-wider">
            Sign into your <br/>account
          </h2>
          <div className="w-full mt-1">
            <p className="text-gray-600 text-base text-left">Please enter your details to sign in</p>
          </div>
        </div>

        {/* Role Toggle – inline-flex with inner background, full width */}
        <div className="mb-6">
          <div className="inline-flex bg-gray-100 p-1.5 rounded-xl shadow-inner w-full justify-center">
            <input
              type="radio"
              id="candidate"
              name="userrole"
              className="hidden"
              checked={role === 'candidate'}
              onChange={() => setRole('candidate')}
            />
            <input
              type="radio"
              id="recruiter"
              name="userrole"
              className="hidden"
              checked={role === 'recruiter'}
              onChange={() => setRole('recruiter')}
            />
            <label
              htmlFor="candidate"
              className={`
                flex items-center justify-center flex-1 py-2 px-5 rounded-lg cursor-pointer font-semibold text-lg transition-all
                ${role === 'candidate'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-700'
                }
              `}
            >
              <i className="fas fa-user-graduate mr-2"></i>
              <span>Candidate</span>
            </label>
            <label
              htmlFor="recruiter"
              className={`
                flex items-center justify-center flex-1 py-2 px-5 rounded-lg cursor-pointer font-semibold text-lg transition-all
                ${role === 'recruiter'
                  ? 'bg-rose-800 text-white shadow-md'
                  : 'bg-white text-gray-700'
                }
              `}
            >
              <i className="fas fa-briefcase mr-2"></i>
              <span>Recruiter</span>
            </label>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-1">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="name@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>
          <div className="mb-5">
            <label htmlFor="credential" className="block text-sm font-medium text-gray-800 mb-1">Password / OTP</label>
            <input
              type="password"
              id="credential"
              placeholder="••••••••••••"
              required
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center font-medium mt-2 mb-3">
              {error}
            </div>
          )}

          <div className="flex justify-center my-6">
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full max-w-[300px] font-semibold py-3 px-12 rounded-lg text-lg transition-all active:scale-98
                ${role === 'recruiter'
                  ? 'border border-rose-800 bg-rose-800 hover:bg-rose-900 text-white'
                  : 'border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="flex justify-center text-sm text-black mt-4">
            <p>Forgot Password?</p>
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=admin@yourcompany.com"
              className="ml-1 text-indigo-600 font-semibold no-underline hover:underline"
            >
              Contact Admin
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;