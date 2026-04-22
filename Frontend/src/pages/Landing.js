import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import lottie from 'lottie-web';


// Import images from the same folder (src/pages/)
import logoImg from './human.png';
import profileIcon from './personal-configuration-interface-symbol.png';
import secureIcon from './secure.png';
import docsIcon from './google-docs.png';
import animationData from './abstract.json';

const Landing = () => {
  const lottieContainer = useRef(null);
  const animationInstance = useRef(null);

  useEffect(() => {
    if (lottieContainer.current) {
      animationInstance.current = lottie.loadAnimation({
        container: lottieContainer.current,
        renderer: 'canvas',
        loop: true,
        autoplay: true,
        animationData: animationData,
      });
    }
    return () => {
      if (animationInstance.current) {
        animationInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-300 to-gray-100 overflow-x-hidden w-full">
      {/* Header - absolute */}
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

      {/* Hero Section */}
      <div className="relative isolate px-6 lg:px-8 pt-14 pb-0">
        <div className="relative max-w-2xl mx-auto pt-32 pb-10">
          {/* Lottie animation container */}
          <div
            ref={lottieContainer}
            className="absolute inset-0 -z-10 opacity-[0.45] pointer-events-none h-96 mt-10"
          />

          {/* Badge - hidden on mobile, visible on sm+ */}
          <div className="hidden sm:flex justify-center mb-8">
            {/* <div className="inline-block whitespace-nowrap rounded-full py-1 px-4 text-sm font-semibold text-blue-600 bg-transparent ring-1 ring-blue-500 hover:ring-2 transition-shadow">
              New Recruitment Drive 2026 Active
            </div> */}
          </div>

          <h1 className="text-4xl sm:text-7xl font-semibold tracking-tight text-black text-center">
            Onboarding <br/>made <span className="text-blue-600">Seamless</span>
          </h1>
          <p className="mt-8 text-lg sm:text-xl font-medium text-gray-600 text-center">
            A centralized secure hub for candidates and recruiters. Track status, verify documents, and manage joining formalities in one place.
          </p>

          <hr className="border-gray-400 my-7" />

          <div className="text-center mt-5">
            <h3 className="text-2xl tracking-wide font-bold text-gray-600">PLATFORM FEATURES</h3>
            <p className="text-gray-600">Everything you need for a smooth transition from "Hired" to "Onboarded"</p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-20 px-8 lg:px-28 my-0 mb-8">
        <div className="min-h-[180px] rounded-md border border-slate-300 bg-slate-100 shadow-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl">
          <img className="h-8 mt-3 ml-3 opacity-75" src={profileIcon} alt="profile icon" />
          <div className="mx-3 mt-2 text-xl text-gray-500 font-bold">Candidate Dashboard</div>
          <div className="mx-3 mb-3 text-gray-500">
            Real-time view of your application status. Track what's pending and what's approved instantly.
          </div>
        </div>
        <div className="min-h-[180px] rounded-md border border-slate-300 bg-slate-100 shadow-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl">
          <img className="h-8 mt-3 ml-3 opacity-75" src={secureIcon} alt="secure icon" />
          <div className="mx-3 mt-2 text-xl text-gray-500 font-bold">Recruiter Controls</div>
          <div className="mx-3 mb-3 text-gray-500">
            Manage incoming candidates, issue offer letters, and verify background checks efficiently.
          </div>
        </div>
        <div className="min-h-[180px] rounded-md border border-slate-300 bg-slate-100 shadow-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl">
          <img className="h-8 mt-3 ml-3 opacity-75" src={docsIcon} alt="docs icon" />
          <div className="mx-3 mt-2 text-xl text-gray-500 font-bold">Secure Documents</div>
          <div className="mx-3 mb-3 text-gray-500">
            End-to-end encrypted uploads for sensitive documents like Aadhar, PAN, and Appointment letters.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;