#!/bin/bash

echo "Removing all isClerkLoaded references..."

# ContractDetails.tsx
sed -i '/const isClerkLoaded = !isAuthLoading;/d' src/app/_components/contracts/ContractDetails.tsx
sed -i 's/ || !isClerkLoaded//g' src/app/_components/contracts/ContractDetails.tsx
sed -i 's/ && isClerkLoaded//g' src/app/_components/contracts/ContractDetails.tsx
sed -i 's/!isClerkLoaded && /false \&\& /g' src/app/_components/contracts/ContractDetails.tsx

# ContractForm.tsx
sed -i '/const isClerkLoaded = !isAuthLoading;/d' src/app/_components/contracts/ContractForm.tsx
sed -i 's/!isClerkLoaded || //' src/app/_components/contracts/ContractForm.tsx
sed -i 's/ || !isClerkLoaded//g' src/app/_components/contracts/ContractForm.tsx
sed -i 's/ && isClerkLoaded//g' src/app/_components/contracts/ContractForm.tsx
sed -i 's/!isClerkLoaded/false/g' src/app/_components/contracts/ContractForm.tsx
sed -i 's/isClerkLoaded && //' src/app/_components/contracts/ContractForm.tsx

# ContractVersionHistory.tsx
sed -i '/const isClerkLoaded = !isLoading;/d' src/app/_components/contracts/ContractVersionHistory.tsx
sed -i 's/ && isClerkLoaded//g' src/app/_components/contracts/ContractVersionHistory.tsx

# ContractTable.tsx
sed -i 's/!isClerkLoaded/false/g' src/app/_components/contracts/ContractTable.tsx

# VendorTable.tsx
sed -i 's/!isClerkLoaded/false/g' src/app/_components/vendor/VendorTable.tsx

# VendorPerformanceDashboard.tsx
sed -i 's/ && isClerkLoaded//g' src/app/_components/vendor/VendorPerformanceDashboard.tsx

# Profile page
sed -i 's/!isClerkLoaded || //' src/app/dashboard/profile/page.tsx

# Settings pages
sed -i 's/!isClerkLoaded || //' src/app/dashboard/settings/enterprise/page.tsx
sed -i 's/!isClerkLoaded || //' src/app/dashboard/settings/users/page.tsx
sed -i 's/!isClerkLoaded || //' src/app/dashboard/settings/page.tsx

echo "Cleanup complete!"