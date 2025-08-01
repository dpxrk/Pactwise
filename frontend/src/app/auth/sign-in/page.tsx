'use client';

import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="relative bg-gradient-to-b from-slate-50 to-transparent py-16 min-h-screen flex items-center justify-center">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-gold/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-gradient-to-tr from-primary/5 to-transparent" />
        <div className="absolute top-1/4 left-1/3 w-1 h-16 bg-gold/30" />
        <div className="absolute top-1/2 right-1/4 w-24 h-1 bg-gold/20" />
      </div>
      
      <div className="max-w-md w-full relative z-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex items-center justify-center">
            <span className="h-px w-8 bg-gold mx-3"></span>
            <span className="text-gold text-sm uppercase tracking-widest font-medium">Secure Access</span>
            <span className="h-px w-8 bg-gold mx-3"></span>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-primary font-sans sm:text-4xl">
            Sign 
            <span className="text-gold relative inline-block ml-2">
              In
              <span className="absolute -bottom-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"></span>
            </span>
          </h1>
          
          <p className="mt-4 text-muted-foreground font-light">
            Access your contract management dashboard
          </p>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm shadow-luxury border border-gold/10 p-8 rounded-sm">
          <SignIn 
            routing="path" 
            path="/auth/sign-in" 
            signUpUrl="/auth/sign-up"
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              elements: {
                formButtonPrimary: 
                  "bg-primary hover:bg-primary/90 text-white group flex h-10 items-center justify-center rounded-sm px-4",
                formButtonIcon: "ml-2 h-4 w-4 transition-transform group-hover:translate-x-1",
                card: "shadow-none border-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                dividerLine: "bg-gold/20",
                dividerText: "text-gold",
                socialButtonsBlockButton: "border-gold/20 text-primary hover:bg-gold/5",
                formFieldInput: "border-gold/20 focus:border-gold focus:ring-gold/30",
                footerActionLink: "text-gold hover:text-gold-dark",
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}