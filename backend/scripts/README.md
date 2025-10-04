# Sample Contract Generator

This script generates realistic contract PDFs for testing the batch upload system.

## Prerequisites

Install the required dependency:

```bash
npm install pdfkit
```

## Usage

Run the script from the project root:

```bash
node backend/scripts/generate-sample-contracts.js
```

## Output

The script will generate 10 sample contract PDFs in the `backend/sample-contracts/` directory:

1. **Software License Agreement** - TechVendor Solutions LLC
2. **Cloud Services Agreement** - CloudHost Inc
3. **Marketing Services Contract** - Creative Marketing Group
4. **Office Equipment Lease** - Office Solutions Ltd.
5. **Consulting Services Agreement** - Strategic Consulting Partners
6. **Data Analytics Platform License** - Analytics Pro Corporation
7. **Cybersecurity Services Contract** - SecureIT Solutions Inc
8. **Legal Services Retainer** - Morrison & Associates Law Firm
9. **Telecommunications Services** - GlobalTel Communications
10. **HR Management Software Subscription** - PeopleFirst Software Co

## Contract Features

Each contract includes:
- ✅ Realistic contract content
- ✅ Primary party: Pactwise (with variations: Pactwise Inc., Pactwise Corporation, Pactwise)
- ✅ Vendor party information (name, email, phone, address)
- ✅ Contract terms (dates, value, scope)
- ✅ Standard clauses (payment, termination, confidentiality, governing law)
- ✅ Signature blocks

## Testing the Batch Upload

1. Generate the PDFs using this script
2. Navigate to **Settings → Data** in the Pactwise dashboard
3. Click **Upload Contracts** under Batch Import
4. Drag and drop the generated PDFs (or select them)
5. Configure upload settings:
   - ☑️ Automatically analyze contracts
   - ☑️ Automatically match vendors
   - ☑️ Create vendors for unmatched contracts
6. Click **Upload X Files**
7. Watch the progress tracker
8. Review any vendor match suggestions

## Expected Results

The batch upload system should:
- ✅ Classify all files as contracts
- ✅ Extract vendor names correctly
- ✅ Match "Pactwise" variations as the primary party
- ✅ Create vendor match suggestions for the vendor parties
- ✅ Auto-create vendors if no existing matches found
- ✅ Show real-time progress updates
- ✅ Complete processing successfully

## Vendor Matching Testing

To test vendor matching:

1. **First upload**: All 10 contracts will create new vendors (no matches)
2. **Second upload**: Re-upload the same files - should get 100% exact matches
3. **Variation testing**: Manually edit a PDF to change "TechVendor Solutions LLC" to "TechVendor Solutions" and re-upload - should get fuzzy match

## Customization

Edit the `contracts` array in `generate-sample-contracts.js` to:
- Add more contracts
- Change vendor names
- Modify contract terms
- Test edge cases
