export interface ContractTemplateData {
  id: string;
  name: string;
  category: string;
  description: string;
  lastModified: string;
  size: string;
  usageCount: number;
  content: string;
}

export const contractTemplates: ContractTemplateData[] = [
  {
    id: 'psa-001',
    name: 'Professional Services Agreement',
    category: 'Services',
    description: 'Comprehensive PSA for consulting and professional services',
    lastModified: '2024-12-15',
    size: '45 KB',
    usageCount: 128,
    content: `PROFESSIONAL SERVICES AGREEMENT

This Professional Services Agreement ("Agreement") is entered into as of [DATE] ("Effective Date") by and between:

[CLIENT NAME], a [STATE] [ENTITY TYPE] with its principal place of business at [ADDRESS] ("Client")

and

[SERVICE PROVIDER NAME], a [STATE] [ENTITY TYPE] with its principal place of business at [ADDRESS] ("Service Provider")

Collectively referred to as the "Parties" and individually as a "Party."

RECITALS

WHEREAS, Client desires to engage Service Provider to provide certain professional services; and

WHEREAS, Service Provider has the necessary expertise, experience, and resources to provide such services;

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:

1. SERVICES

1.1 Scope of Services. Service Provider shall provide the professional services as described in one or more Statements of Work executed by both Parties and attached hereto as exhibits ("Services"). Each Statement of Work shall be deemed incorporated into and governed by the terms of this Agreement.

1.2 Performance Standards. Service Provider shall perform the Services in a professional and workmanlike manner consistent with industry standards and best practices. Service Provider shall devote adequate resources and qualified personnel to perform the Services.

1.3 Changes to Services. Any changes to the Services must be agreed upon in writing through an executed Change Order or amended Statement of Work signed by authorized representatives of both Parties.

2. TERM AND TERMINATION

2.1 Term. This Agreement shall commence on the Effective Date and continue for [TERM LENGTH] unless earlier terminated in accordance with this Section 2 ("Term").

2.2 Termination for Convenience. Either Party may terminate this Agreement or any Statement of Work for convenience upon [NOTICE PERIOD] days prior written notice to the other Party.

2.3 Termination for Cause. Either Party may terminate this Agreement immediately upon written notice if the other Party: (a) materially breaches this Agreement and fails to cure such breach within [CURE PERIOD] days after receiving written notice thereof; (b) becomes insolvent, files for bankruptcy, or has such a petition filed against it; or (c) ceases to do business.

2.4 Effect of Termination. Upon termination:
   a) Service Provider shall immediately cease performing Services except as necessary to close out work in progress;
   b) Client shall pay Service Provider for all Services properly performed through the termination date;
   c) Service Provider shall deliver all Deliverables (whether complete or incomplete) and Client property to Client;
   d) Sections 4, 5, 6, 7, 8, and 10 shall survive termination.

3. COMPENSATION AND PAYMENT

3.1 Fees. Client shall pay Service Provider the fees set forth in each applicable Statement of Work ("Fees").

3.2 Expenses. Client shall reimburse Service Provider for reasonable, pre-approved, out-of-pocket expenses incurred in connection with the Services, provided such expenses are documented in accordance with Client's expense reimbursement policies.

3.3 Invoicing and Payment. Service Provider shall invoice Client [BILLING FREQUENCY]. Payment shall be due within [PAYMENT TERMS] days of invoice date. Late payments shall accrue interest at the rate of [LATE FEE RATE]% per month or the maximum rate permitted by law, whichever is less.

3.4 Taxes. Fees are exclusive of all applicable taxes, duties, and similar charges. Client shall be responsible for all such taxes except for taxes based on Service Provider's net income.

4. INTELLECTUAL PROPERTY RIGHTS

4.1 Client Materials. Client retains all right, title, and interest in and to all materials, data, and information provided by Client to Service Provider ("Client Materials").

4.2 Work Product. All deliverables, documents, work product, and other materials created by Service Provider specifically for Client under this Agreement ("Work Product") shall be considered works made for hire and shall be the sole and exclusive property of Client upon payment in full. To the extent any Work Product does not qualify as work made for hire, Service Provider hereby assigns all right, title, and interest in such Work Product to Client.

4.3 Service Provider Tools. Service Provider retains all rights to its pre-existing methodologies, tools, templates, software, and other materials ("Service Provider Tools"). Service Provider grants Client a non-exclusive, non-transferable license to use any Service Provider Tools incorporated into the Work Product solely in connection with its use of the Work Product.

4.4 Third-Party Materials. Service Provider shall not incorporate any third-party materials into the Work Product without Client's prior written consent.

5. CONFIDENTIALITY

5.1 Confidential Information. Each Party ("Receiving Party") agrees to maintain in confidence all non-public information disclosed by the other Party ("Disclosing Party") that is marked as confidential or would reasonably be considered confidential ("Confidential Information").

5.2 Obligations. The Receiving Party shall: (a) use Confidential Information only for purposes of this Agreement; (b) protect Confidential Information using the same degree of care it uses for its own confidential information, but no less than reasonable care; and (c) not disclose Confidential Information to any third party except to employees, contractors, and advisors who need to know and are bound by confidentiality obligations.

5.3 Exceptions. Confidential Information does not include information that: (a) is or becomes publicly available through no breach of this Agreement; (b) was rightfully known prior to disclosure; (c) is rightfully received from a third party without breach; or (d) is independently developed without use of Confidential Information.

5.4 Required Disclosure. If required by law to disclose Confidential Information, the Receiving Party shall provide prompt notice to enable the Disclosing Party to seek protective measures.

5.5 Duration. Confidentiality obligations shall survive for [CONFIDENTIALITY TERM] years after termination of this Agreement.

6. REPRESENTATIONS AND WARRANTIES

6.1 Mutual Warranties. Each Party represents and warrants that:
   a) It has full power and authority to enter into this Agreement;
   b) This Agreement constitutes a legal, valid, and binding obligation;
   c) Its performance will not violate any agreement with third parties.

6.2 Service Provider Warranties. Service Provider represents and warrants that:
   a) Services will be performed in a professional and workmanlike manner;
   b) Work Product will be original or properly licensed;
   c) Work Product will not infringe upon any third-party intellectual property rights;
   d) Personnel performing Services will have necessary qualifications and expertise.

6.3 Warranty Period. Service Provider warrants that Services will conform to applicable specifications for [WARRANTY PERIOD] days after delivery/acceptance. For any breach of this warranty, Service Provider shall re-perform the non-conforming Services at no additional cost to Client.

6.4 DISCLAIMER. EXCEPT AS EXPRESSLY PROVIDED HEREIN, SERVICE PROVIDER MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.

7. LIMITATION OF LIABILITY

7.1 LIMITATION. EXCEPT FOR BREACHES OF SECTION 5 (CONFIDENTIALITY) OR SECTION 9 (INDEMNIFICATION), IN NO EVENT SHALL EITHER PARTY'S TOTAL LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT EXCEED THE TOTAL FEES PAID OR PAYABLE TO SERVICE PROVIDER IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY.

7.2 EXCLUSION OF DAMAGES. NEITHER PARTY SHALL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, REVENUE, DATA, OR USE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

8. INDEMNIFICATION

8.1 By Service Provider. Service Provider shall indemnify, defend, and hold harmless Client from and against any claims, damages, losses, and expenses (including reasonable attorneys' fees) arising from: (a) Service Provider's breach of this Agreement; (b) Service Provider's negligence or willful misconduct; or (c) infringement of third-party intellectual property rights by the Work Product.

8.2 By Client. Client shall indemnify, defend, and hold harmless Service Provider from and against any claims, damages, losses, and expenses (including reasonable attorneys' fees) arising from: (a) Client's breach of this Agreement; (b) Client's use of the Work Product in a manner not contemplated by this Agreement; or (c) Client Materials.

8.3 Procedure. The indemnified party shall promptly notify the indemnifying party of any claim, cooperate in the defense, and allow the indemnifying party to control the defense and settlement.

9. INDEPENDENT CONTRACTOR

9.1 Relationship. Service Provider is an independent contractor and not an employee, agent, or partner of Client. Service Provider shall have sole control over the manner and means of performing the Services.

9.2 No Benefits. Service Provider is not entitled to employee benefits, and is responsible for all taxes, insurance, and other obligations related to its personnel.

9.3 Personnel. Service Provider shall provide qualified personnel to perform the Services. Client may request removal of any Service Provider personnel for reasonable cause.

10. GENERAL PROVISIONS

10.1 Assignment. Neither Party may assign this Agreement without the other Party's prior written consent, except that either Party may assign to a successor in connection with a merger, acquisition, or sale of all or substantially all of its assets. Any unauthorized assignment is void.

10.2 Notices. All notices must be in writing and delivered by email (with confirmation), courier, or certified mail to the addresses set forth above or as updated in writing.

10.3 Force Majeure. Neither Party shall be liable for delays or failures in performance resulting from causes beyond its reasonable control, including acts of God, natural disasters, war, terrorism, labor disputes, or government actions.

10.4 Governing Law. This Agreement shall be governed by the laws of [STATE], without regard to conflicts of law principles.

10.5 Dispute Resolution. The Parties shall attempt to resolve any dispute through good faith negotiations. If unsuccessful within thirty (30) days, the dispute may be resolved through [MEDIATION/ARBITRATION/LITIGATION] in [JURISDICTION].

10.6 Entire Agreement. This Agreement, including all Statements of Work, constitutes the entire agreement between the Parties and supersedes all prior agreements and understandings. This Agreement may only be amended in writing signed by both Parties.

10.7 Severability. If any provision is held invalid or unenforceable, the remaining provisions shall remain in full force and effect.

10.8 Waiver. No waiver of any provision shall be deemed a waiver of any other provision or subsequent breach.

10.9 Counterparts. This Agreement may be executed in counterparts, each of which shall be deemed an original.

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

CLIENT:                                SERVICE PROVIDER:

[CLIENT NAME]                          [SERVICE PROVIDER NAME]

By: _________________________         By: _________________________
Name:                                 Name:
Title:                                Title:
Date:                                 Date:`,
  },
  {
    id: 'sow-001',
    name: 'Statement of Work',
    category: 'Services',
    description: 'Detailed SOW template for project-based engagements',
    lastModified: '2024-12-10',
    size: '32 KB',
    usageCount: 94,
    content: `STATEMENT OF WORK

SOW Number: [SOW-NUMBER]
Project Name: [PROJECT NAME]
Effective Date: [DATE]

This Statement of Work ("SOW") is entered into pursuant to the Professional Services Agreement dated [DATE] ("Agreement") between:

CLIENT: [CLIENT NAME]
SERVICE PROVIDER: [SERVICE PROVIDER NAME]

This SOW is incorporated into and governed by the terms and conditions of the Agreement. In the event of any conflict between this SOW and the Agreement, the Agreement shall control.

1. PROJECT OVERVIEW

1.1 Background
[Provide context and business justification for the project]

1.2 Objectives
The objectives of this project are to:
• [Objective 1]
• [Objective 2]
• [Objective 3]

1.3 Scope Summary
Service Provider will provide [SUMMARY OF SERVICES] to achieve the stated objectives.

2. DETAILED SCOPE OF WORK

2.1 Phase 1: [PHASE NAME]
Duration: [TIMEFRAME]

Tasks:
• Task 1.1: [Description]
  - Subtask 1.1.1
  - Subtask 1.1.2
• Task 1.2: [Description]
  - Subtask 1.2.1
  - Subtask 1.2.2

Deliverables:
• Deliverable 1.1: [Description] - Due: [DATE]
• Deliverable 1.2: [Description] - Due: [DATE]

2.2 Phase 2: [PHASE NAME]
Duration: [TIMEFRAME]

Tasks:
• Task 2.1: [Description]
  - Subtask 2.1.1
  - Subtask 2.1.2
• Task 2.2: [Description]
  - Subtask 2.2.1
  - Subtask 2.2.2

Deliverables:
• Deliverable 2.1: [Description] - Due: [DATE]
• Deliverable 2.2: [Description] - Due: [DATE]

2.3 Phase 3: [PHASE NAME]
Duration: [TIMEFRAME]

Tasks:
• Task 3.1: [Description]
• Task 3.2: [Description]

Deliverables:
• Deliverable 3.1: [Description] - Due: [DATE]
• Deliverable 3.2: [Description] - Due: [DATE]

3. OUT OF SCOPE

The following items are explicitly excluded from this SOW:
• [Out of scope item 1]
• [Out of scope item 2]
• [Out of scope item 3]

Any work not explicitly included in Section 2 is considered out of scope and will require a separate SOW or Change Order.

4. DELIVERABLES

4.1 Deliverable Specifications

Deliverable 1: [NAME]
• Description: [Detailed description]
• Format: [File format, medium, etc.]
• Acceptance Criteria: [Specific criteria for acceptance]
• Due Date: [DATE]

Deliverable 2: [NAME]
• Description: [Detailed description]
• Format: [File format, medium, etc.]
• Acceptance Criteria: [Specific criteria for acceptance]
• Due Date: [DATE]

[Continue for all deliverables]

4.2 Deliverable Review and Acceptance
• Client shall have [NUMBER] business days to review each deliverable
• Client shall provide written acceptance or detailed rejection with specific deficiencies
• Service Provider shall have [NUMBER] business days to remedy deficiencies
• Deliverables not rejected within review period are deemed accepted

5. PROJECT TIMELINE

Project Start Date: [DATE]
Project End Date: [DATE]
Total Duration: [NUMBER] weeks/months

Milestone Schedule:
┌────────────────────────────────────────────────────┐
│ Milestone                     │ Target Date        │
├────────────────────────────────────────────────────┤
│ Project Kickoff               │ [DATE]             │
│ Phase 1 Complete              │ [DATE]             │
│ Mid-Project Review            │ [DATE]             │
│ Phase 2 Complete              │ [DATE]             │
│ Phase 3 Complete              │ [DATE]             │
│ Final Delivery                │ [DATE]             │
│ Project Close-out             │ [DATE]             │
└────────────────────────────────────────────────────┘

6. ROLES AND RESPONSIBILITIES

6.1 Service Provider Team

Project Manager: [NAME]
• Overall project coordination and management
• Primary point of contact for Client
• Status reporting and escalation management

[ROLE]: [NAME]
• [Responsibility 1]
• [Responsibility 2]

[ROLE]: [NAME]
• [Responsibility 1]
• [Responsibility 2]

6.2 Client Team

Project Sponsor: [NAME]
• Executive oversight and decision-making authority
• Resource allocation and priority setting

Project Manager: [NAME]
• Day-to-day coordination with Service Provider
• Review and acceptance of deliverables
• Internal stakeholder management

Subject Matter Expert: [NAME]
• [Responsibility 1]
• [Responsibility 2]

6.3 Joint Responsibilities
• Weekly status meetings
• Issue and risk management
• Change control process
• Quality assurance reviews

7. CLIENT RESPONSIBILITIES AND DEPENDENCIES

Client shall provide the following to enable Service Provider to perform the Services:

7.1 Resources
• Access to [SYSTEMS/FACILITIES]
• [NUMBER] Client personnel for [DURATION]
• Subject matter expertise in [AREAS]

7.2 Information and Materials
• [SPECIFIC DOCUMENTS/DATA] by [DATE]
• Access to [SYSTEMS/DATABASES]
• Historical data for [PURPOSE]

7.3 Decisions and Approvals
• Approve project plan within [NUMBER] days of submission
• Provide feedback on deliverables within [NUMBER] business days
• Designate authorized decision-makers

7.4 Dependencies
The following Client actions are critical to project success:
• [CRITICAL DEPENDENCY 1] - Required by: [DATE]
• [CRITICAL DEPENDENCY 2] - Required by: [DATE]
• [CRITICAL DEPENDENCY 3] - Required by: [DATE]

Failure to meet these dependencies may result in project delays and additional fees.

8. PROJECT MANAGEMENT

8.1 Communication Plan
• Weekly status meetings: [DAY/TIME]
• Monthly steering committee meetings
• Ad-hoc meetings as needed
• Primary communication: [EMAIL/PLATFORM]

8.2 Status Reporting
Service Provider shall provide:
• Weekly status reports covering progress, issues, risks, and upcoming activities
• Monthly executive summaries
• Ad-hoc reports upon request

8.3 Issue and Risk Management
• Issues and risks shall be logged, tracked, and regularly reviewed
• Critical issues shall be escalated within [TIMEFRAME]
• Risk mitigation plans shall be developed for high-priority risks

8.4 Change Control Process
• Changes to scope, schedule, or budget require a written Change Order
• Change requests shall include impact analysis (scope, schedule, cost)
• Changes require approval by authorized representatives of both Parties
• Approved changes shall be documented and incorporated into project plan

9. FEES AND PAYMENT TERMS

9.1 Fee Structure

Option A - Fixed Fee:
Total Fixed Fee: $[AMOUNT]

Payment Schedule:
• [PERCENTAGE]% upon SOW execution: $[AMOUNT]
• [PERCENTAGE]% upon Phase 1 completion: $[AMOUNT]
• [PERCENTAGE]% upon Phase 2 completion: $[AMOUNT]
• [PERCENTAGE]% upon final acceptance: $[AMOUNT]

Option B - Time and Materials:
Hourly Rates:
• [ROLE]: $[RATE]/hour
• [ROLE]: $[RATE]/hour
• [ROLE]: $[RATE]/hour

Not-to-Exceed Amount: $[AMOUNT]

Payment Terms: Monthly in arrears based on actual hours worked

Option C - Blended:
Base Fixed Fee: $[AMOUNT]
Additional T&M: Up to $[AMOUNT] at rates specified above
Total Project Budget: $[AMOUNT]

9.2 Expenses
Reimbursable expenses (with prior approval):
• Travel: [POLICY]
• Lodging: [POLICY]
• Other: [SPECIFIC ITEMS]

Estimated expenses: $[AMOUNT]

9.3 Invoicing
• Invoices submitted [FREQUENCY]
• Payment due within [NUMBER] days of invoice date
• Invoices shall include detailed breakdown of hours/deliverables

10. ASSUMPTIONS AND CONSTRAINTS

10.1 Assumptions
This SOW is based on the following assumptions:
• [ASSUMPTION 1]
• [ASSUMPTION 2]
• [ASSUMPTION 3]

If any assumption proves incorrect, Service Provider reserves the right to request a Change Order.

10.2 Constraints
• [CONSTRAINT 1]
• [CONSTRAINT 2]
• [CONSTRAINT 3]

11. ACCEPTANCE CRITERIA AND PROJECT COMPLETION

11.1 Acceptance Criteria
The project shall be deemed complete and accepted when:
• All deliverables have been delivered and accepted by Client
• All acceptance criteria specified in Section 4 have been met
• Final project report has been delivered and reviewed
• Client provides written acceptance of project completion

11.2 Warranty
Service Provider warrants that deliverables will conform to specifications for [NUMBER] days following acceptance. Service Provider shall remedy any non-conforming deliverables at no additional cost to Client.

11.3 Closeout Activities
Upon project completion:
• Final project report and documentation delivery
• Knowledge transfer sessions
• Post-project review meeting
• Return of Client property and confidential information
• Final invoice and payment

12. SPECIAL TERMS AND CONDITIONS

[Include any project-specific terms, such as:]
• Security requirements
• Compliance obligations
• Insurance requirements
• Background check requirements
• Non-solicitation provisions
• Special intellectual property provisions

13. APPROVAL AND SIGNATURE

By signing below, the Parties agree to the terms and conditions of this Statement of Work.

CLIENT:                                SERVICE PROVIDER:

[CLIENT NAME]                          [SERVICE PROVIDER NAME]

By: _________________________         By: _________________________
Name:                                 Name:
Title:                                Title:
Date:                                 Date:

Project Manager:                      Project Manager:

By: _________________________         By: _________________________
Name:                                 Name:
Date:                                 Date:`,
  },
  {
    id: 'nda-001',
    name: 'Non-Disclosure Agreement (Mutual)',
    category: 'Legal',
    description: 'Mutual NDA for protecting confidential information',
    lastModified: '2024-12-18',
    size: '28 KB',
    usageCount: 256,
    content: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of [DATE] ("Effective Date") by and between:

[PARTY A NAME], a [STATE] [ENTITY TYPE] with its principal place of business at [ADDRESS] ("Party A")

and

[PARTY B NAME], a [STATE] [ENTITY TYPE] with its principal place of business at [ADDRESS] ("Party B")

Each of Party A and Party B may be referred to individually as a "Party" or collectively as the "Parties."

RECITALS

WHEREAS, the Parties wish to explore a potential business relationship relating to [PURPOSE] ("Purpose");

WHEREAS, in connection with such discussions, each Party may disclose to the other Party certain confidential and proprietary information;

WHEREAS, the Parties desire to protect the confidentiality of such information;

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:

1. DEFINITION OF CONFIDENTIAL INFORMATION

1.1 "Confidential Information" means any and all information, whether written, oral, electronic, visual, or in any other form, that is disclosed by one Party (the "Disclosing Party") to the other Party (the "Receiving Party") in connection with the Purpose, including but not limited to:

   a) Technical Information: algorithms, architectures, designs, diagrams, documentation, formulas, inventions (whether patentable or not), know-how, methods, processes, programs, prototypes, research, schematics, source code, specifications, techniques, and trade secrets;

   b) Business Information: business plans, business strategies, customer information, customer lists, financial information, forecasts, marketing plans, pricing information, product development plans, sales data, supplier information, and vendor lists;

   c) Product Information: features, functionality, product designs, product plans, product roadmaps, and product specifications;

   d) Personal Information: employee information, personnel data, and any personally identifiable information;

   e) Other Information: analyses, compilations, data, reports, studies, and summaries that contain, reflect, or are derived from any of the foregoing.

1.2 Confidential Information includes information that is:
   a) Marked as "Confidential," "Proprietary," or with a similar designation;
   b) Orally disclosed and identified as confidential at the time of disclosure, and summarized in writing and delivered to the Receiving Party within thirty (30) days of disclosure;
   c) Would reasonably be considered confidential given the nature of the information and circumstances of disclosure.

2. EXCLUSIONS FROM CONFIDENTIAL INFORMATION

Confidential Information does not include information that:

   a) Is or becomes publicly available through no breach of this Agreement by the Receiving Party;

   b) Was rightfully in the Receiving Party's possession prior to disclosure by the Disclosing Party, as evidenced by the Receiving Party's written records;

   c) Is rightfully received by the Receiving Party from a third party without breach of any confidentiality obligation;

   d) Is independently developed by the Receiving Party without use of or reference to the Disclosing Party's Confidential Information, as evidenced by written records;

   e) Is approved for release by prior written authorization of the Disclosing Party.

3. OBLIGATIONS OF RECEIVING PARTY

3.1 Confidentiality. The Receiving Party shall:
   a) Hold the Confidential Information in strict confidence;
   b) Not disclose the Confidential Information to any third party;
   c) Use the Confidential Information solely for the Purpose;
   d) Protect the Confidential Information using the same degree of care it uses to protect its own confidential information of similar importance, but in no event less than reasonable care.

3.2 Limited Disclosure. The Receiving Party may disclose Confidential Information only to its employees, officers, directors, agents, consultants, contractors, and advisors (collectively, "Representatives") who:
   a) Have a legitimate need to know the Confidential Information for the Purpose;
   b) Have been informed of the confidential nature of the Confidential Information;
   c) Are bound by written confidentiality obligations at least as restrictive as those contained herein.

The Receiving Party shall be responsible for any breach of this Agreement by its Representatives.

3.3 No Reverse Engineering. The Receiving Party shall not reverse engineer, disassemble, or decompile any prototypes, software, or other tangible objects that embody the Disclosing Party's Confidential Information.

3.4 Notice of Unauthorized Disclosure. The Receiving Party shall immediately notify the Disclosing Party upon discovery of any unauthorized use or disclosure of Confidential Information and shall cooperate with the Disclosing Party in efforts to prevent or minimize any such unauthorized use or disclosure.

4. COMPELLED DISCLOSURE

4.1 If the Receiving Party is required by law, regulation, court order, or other legal process to disclose any Confidential Information, the Receiving Party shall:
   a) Promptly notify the Disclosing Party in writing of such requirement prior to disclosure (unless prohibited by law);
   b) Cooperate with the Disclosing Party in seeking a protective order or other appropriate remedy;
   c) Disclose only such Confidential Information as is legally required;
   d) Use reasonable efforts to obtain confidential treatment for any Confidential Information disclosed.

4.2 The Receiving Party's obligation to provide notice under Section 4.1 shall not apply if such notice is prohibited by law or would compromise the effectiveness of an investigation by governmental authorities.

5. NO LICENSE OR OWNERSHIP RIGHTS

5.1 No License. Nothing in this Agreement grants the Receiving Party any license, interest, or right in or to the Disclosing Party's Confidential Information, except the limited right to use such Confidential Information solely for the Purpose.

5.2 Retention of Rights. All Confidential Information remains the sole property of the Disclosing Party. The Disclosing Party retains all right, title, and interest in and to its Confidential Information, including all intellectual property rights.

5.3 No Obligation to Disclose. Neither Party is obligated to disclose any Confidential Information under this Agreement. Each Party may determine in its sole discretion what information to disclose and may cease disclosing information at any time.

6. RETURN OR DESTRUCTION OF CONFIDENTIAL INFORMATION

Upon the earlier of (a) completion or termination of discussions regarding the Purpose, (b) written request by the Disclosing Party, or (c) termination of this Agreement, the Receiving Party shall, at the Disclosing Party's option:

   a) Promptly return to the Disclosing Party all Confidential Information, including all copies, notes, and derivatives thereof; or

   b) Destroy all Confidential Information, including all copies, notes, and derivatives thereof, and provide written certification of such destruction signed by an authorized officer of the Receiving Party.

Notwithstanding the foregoing, the Receiving Party may retain:
   • One archival copy of Confidential Information for legal compliance purposes, subject to continued confidentiality obligations;
   • Confidential Information contained in electronic backup systems that cannot reasonably be deleted, subject to continued confidentiality obligations.

7. NO REPRESENTATION OR WARRANTY

THE DISCLOSING PARTY MAKES NO REPRESENTATION OR WARRANTY, EXPRESS OR IMPLIED, AS TO THE ACCURACY, COMPLETENESS, OR FITNESS FOR ANY PURPOSE OF ANY CONFIDENTIAL INFORMATION. THE DISCLOSING PARTY SHALL NOT BE LIABLE FOR ANY ERRORS OR OMISSIONS IN THE CONFIDENTIAL INFORMATION OR FOR ANY ACTIONS TAKEN IN RELIANCE THEREON.

8. NO OBLIGATION TO PROCEED

This Agreement does not create any obligation for either Party to:
   a) Proceed with any transaction or relationship;
   b) Continue discussions regarding the Purpose;
   c) Refrain from conducting similar discussions with other parties.

Each Party is free to pursue alternative transactions and relationships, subject to the confidentiality obligations herein.

9. NO SOLICITATION

9.1 During the term of this Agreement and for [NUMBER] months thereafter, neither Party shall, without the prior written consent of the other Party, directly or indirectly:
   a) Solicit for employment any employee of the other Party with whom it had contact or who was involved in discussions related to the Purpose;
   b) Hire any such employee, even if the employee initiates contact;
   c) Encourage any such employee to leave the employment of the other Party.

9.2 This restriction shall not apply to:
   a) General solicitations not specifically directed at the other Party's employees;
   b) Hiring of employees who respond to such general solicitations;
   c) Employees who have been terminated by the other Party for at least [NUMBER] months.

10. TERM AND TERMINATION

10.1 Term. This Agreement shall commence on the Effective Date and continue for [NUMBER] years, unless earlier terminated by either Party upon thirty (30) days' prior written notice to the other Party.

10.2 Survival. The obligations of the Receiving Party under this Agreement with respect to Confidential Information disclosed during the term shall survive termination and continue for a period of [NUMBER] years from the date of disclosure of such Confidential Information.

10.3 Immediate Termination. Either Party may terminate this Agreement immediately upon written notice if the other Party materially breaches this Agreement.

11. REMEDIES

11.1 Equitable Relief. The Receiving Party acknowledges that the Confidential Information is valuable and unique, and that disclosure in breach of this Agreement will cause irreparable harm to the Disclosing Party for which monetary damages would be an inadequate remedy. Accordingly, the Disclosing Party shall be entitled to seek equitable relief, including injunction and specific performance, in addition to all other remedies available at law or in equity.

11.2 No Waiver. The failure of either Party to enforce any provision of this Agreement shall not constitute a waiver of that or any other provision.

11.3 Cumulative Remedies. All remedies provided herein are cumulative and not exclusive.

12. GENERAL PROVISIONS

12.1 Entire Agreement. This Agreement constitutes the entire agreement between the Parties concerning the subject matter hereof and supersedes all prior or contemporaneous agreements, understandings, and communications, whether written or oral. This Agreement may only be amended by a written instrument signed by both Parties.

12.2 Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the State of [STATE], without giving effect to any conflicts of law principles.

12.3 Jurisdiction and Venue. Any action or proceeding arising out of or relating to this Agreement shall be brought exclusively in the state or federal courts located in [COUNTY], [STATE], and each Party irrevocably consents to the jurisdiction and venue of such courts.

12.4 Assignment. Neither Party may assign this Agreement or any rights or obligations hereunder without the prior written consent of the other Party. Any attempted assignment in violation of this provision shall be void. This Agreement shall be binding upon and inure to the benefit of the Parties and their permitted successors and assigns.

12.5 Severability. If any provision of this Agreement is held to be invalid, illegal, or unenforceable, the validity, legality, and enforceability of the remaining provisions shall not be affected or impaired.

12.6 Waiver. No waiver of any provision of this Agreement shall be effective unless in writing and signed by the Party against whom such waiver is sought to be enforced. No waiver of any breach shall be deemed a waiver of any other or subsequent breach.

12.7 Notices. All notices, requests, consents, and other communications under this Agreement shall be in writing and shall be deemed given when delivered personally, sent by confirmed email, or sent by registered or certified mail, postage prepaid, return receipt requested, to the addresses set forth above or to such other address as either Party may designate by notice to the other.

12.8 Independent Parties. The Parties are independent contractors. This Agreement does not create any agency, partnership, joint venture, or employment relationship between the Parties.

12.9 Counterparts. This Agreement may be executed in counterparts, each of which shall be deemed an original and all of which together shall constitute one and the same instrument. Electronic signatures shall have the same force and effect as original signatures.

12.10 Export Control. Each Party shall comply with all applicable export control laws and regulations. Neither Party shall export or re-export any Confidential Information in violation of such laws and regulations.

12.11 Headings. The headings in this Agreement are for convenience only and shall not affect the interpretation of this Agreement.

12.12 Interpretation. This Agreement shall be construed fairly as to both Parties and not more strictly against either Party regardless of who drafted it.

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

PARTY A:                               PARTY B:

[PARTY A NAME]                         [PARTY B NAME]

By: _________________________         By: _________________________
Name:                                 Name:
Title:                                Title:
Date:                                 Date:`,
  },
];
