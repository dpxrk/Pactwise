"use client";

import { ArrowLeft, ChevronDown, Mail, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I upload my first contract?",
        a: "Navigate to Dashboard > Contracts > Upload. You can drag and drop PDF, Word, or image files. Our AI will automatically extract key information like parties, dates, and obligations.",
      },
      {
        q: "What file formats are supported?",
        a: "We support PDF, DOCX, DOC, TXT, and common image formats (PNG, JPG). Our OCR engine can extract text from scanned documents as well.",
      },
      {
        q: "How do I invite team members?",
        a: "Go to Settings > Users and click 'Invite User'. Enter their email address and select their role. They'll receive an invitation to join your organization.",
      },
      {
        q: "What's the difference between user roles?",
        a: "We have 5 roles: Viewer (read-only), User (create/edit own), Manager (manage team), Admin (full settings access), and Owner (billing and enterprise settings).",
      },
    ],
  },
  {
    category: "AI & Analysis",
    questions: [
      {
        q: "How does the AI analysis work?",
        a: "Our AI agents analyze your contracts to extract key terms, identify risks, track obligations, and provide summaries. Analysis runs automatically when you upload a contract.",
      },
      {
        q: "What are AI Agents?",
        a: "Pactwise has 7 specialized AI agents: Secretary (document processing), Manager (workflows), Financial (cost analysis), Legal (clause review), Analytics (reporting), Vendor (supplier management), and Notifications (alerts).",
      },
      {
        q: "How accurate is the AI extraction?",
        a: "Our AI achieves 95%+ accuracy on standard contract formats. We recommend reviewing extracted data for critical contracts. The AI learns and improves over time.",
      },
      {
        q: "Is my data used to train AI models?",
        a: "No. Your contract data is never used to train external AI models. All analysis happens securely within your isolated environment.",
      },
    ],
  },
  {
    category: "Billing & Plans",
    questions: [
      {
        q: "How does the free trial work?",
        a: "You get 14 days of full access to all features. No credit card required to start. At the end of the trial, choose a plan or your account becomes read-only.",
      },
      {
        q: "Can I change plans later?",
        a: "Yes, you can upgrade or downgrade at any time from Settings > Billing. Changes take effect immediately, with prorated billing.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards (Visa, Mastercard, Amex) and can arrange invoicing for Enterprise customers.",
      },
      {
        q: "Do you offer annual billing discounts?",
        a: "Yes! You save 20% with annual billing compared to monthly plans.",
      },
    ],
  },
  {
    category: "Security & Privacy",
    questions: [
      {
        q: "How is my data protected?",
        a: "We use AES-256 encryption at rest and TLS 1.3 in transit. Your data is stored in isolated, multi-tenant secure infrastructure with role-based access controls.",
      },
      {
        q: "Where is my data stored?",
        a: "Data is stored in secure cloud infrastructure. Enterprise customers can request specific geographic regions for data residency requirements.",
      },
      {
        q: "Can I export my data?",
        a: "Yes, you can export all your contracts and data at any time from Settings > Data. We support CSV, JSON, and ZIP exports.",
      },
      {
        q: "What happens if I cancel my subscription?",
        a: "Your data remains accessible in read-only mode for 30 days. You can export everything during this period. After 30 days, data is permanently deleted.",
      },
    ],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFaqs = faqs
    .map((category) => ({
      ...category,
      questions: category.questions.filter(
        (q) =>
          q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.a.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Header Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
            Help Center
          </h1>
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="font-mono text-xs uppercase tracking-wider hover:bg-ghost-100"
            >
              <ArrowLeft className="mr-2 h-3 w-3" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-purple-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-semibold mb-4">How can we help?</h2>
          <p className="text-purple-200 mb-8">
            Search our knowledge base or browse common questions below.
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ghost-500" />
            <Input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-6 bg-white text-ghost-900 border-0 font-mono"
            />
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ghost-600 mb-4">
              No results found for &ldquo;{searchQuery}&rdquo;
            </p>
            <Button
              variant="outline"
              onClick={() => setSearchQuery("")}
              className="font-mono text-xs"
            >
              Clear search
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredFaqs.map((category, categoryIdx) => (
              <div key={categoryIdx}>
                <h3 className="font-mono text-xs uppercase tracking-wider text-purple-900 mb-4 pb-2 border-b border-ghost-300">
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.questions.map((item, itemIdx) => {
                    const itemId = `${categoryIdx}-${itemIdx}`;
                    const isExpanded = expandedItems.has(itemId);
                    return (
                      <div
                        key={itemIdx}
                        className="bg-white border border-ghost-300"
                      >
                        <button
                          onClick={() => toggleItem(itemId)}
                          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-ghost-50 transition-colors"
                        >
                          <span className="font-medium text-ghost-900 pr-4">
                            {item.q}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-ghost-500 flex-shrink-0 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="px-6 pb-4">
                            <p className="text-sm text-ghost-600 leading-relaxed border-l-2 border-purple-500 pl-4">
                              {item.a}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Section */}
      <div className="bg-white border-t border-ghost-300 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-purple-900 mb-2">
              Still need help?
            </h3>
            <p className="text-ghost-600">
              Our support team is here to assist you.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <a
              href="mailto:support@pactwise.io"
              className="flex items-center gap-4 p-6 border border-ghost-300 hover:border-purple-500 transition-colors"
            >
              <div className="p-3 bg-purple-50">
                <Mail className="w-6 h-6 text-purple-900" />
              </div>
              <div>
                <h4 className="font-semibold text-ghost-900">Email Support</h4>
                <p className="text-sm text-ghost-600">support@pactwise.io</p>
              </div>
            </a>
            <Link
              href="/dashboard"
              className="flex items-center gap-4 p-6 border border-ghost-300 hover:border-purple-500 transition-colors"
            >
              <div className="p-3 bg-purple-50">
                <MessageCircle className="w-6 h-6 text-purple-900" />
              </div>
              <div>
                <h4 className="font-semibold text-ghost-900">In-App Chat</h4>
                <p className="text-sm text-ghost-600">
                  Available in your dashboard
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
