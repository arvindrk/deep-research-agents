#!/bin/bash

echo "🔍 Checking for hover movement patterns..."
echo ""

ERRORS=0

# Check for translate on hover
echo "Checking for translate on hover..."
if grep -rn "hover:.*translate" src/components/ --include="*.tsx" 2>/dev/null; then
  echo "❌ Found hover:translate patterns that cause element movement"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ No translate patterns found"
fi

echo ""

# Check for scale on hover
echo "Checking for scale on hover..."
if grep -rn "hover:scale" src/components/ --include="*.tsx" 2>/dev/null; then
  echo "❌ Found hover:scale patterns that cause element movement"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ No scale patterns found"
fi

echo ""

# Check for margin changes on hover
echo "Checking for margin changes on hover..."
if grep -rn "hover:\(m-\|mt-\|mr-\|mb-\|ml-\|mx-\|my-\)" src/components/ --include="*.tsx" 2>/dev/null; then
  echo "❌ Found hover margin patterns that cause layout shifts"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ No margin change patterns found"
fi

echo ""

# Check for padding changes on hover
echo "Checking for padding changes on hover..."
if grep -rn "hover:\(p-\|pt-\|pr-\|pb-\|pl-\|px-\|py-\)" src/components/ --include="*.tsx" 2>/dev/null; then
  echo "❌ Found hover padding patterns that shift content"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ No padding change patterns found"
fi

echo ""

if [ $ERRORS -eq 0 ]; then
  echo "✅ All checks passed - no hover movement detected"
  exit 0
else
  echo "❌ Found $ERRORS pattern(s) that cause hover movement"
  echo ""
  echo "Allowed hover effects:"
  echo "  ✅ hover:bg-* (background changes)"
  echo "  ✅ hover:text-* (text color changes)"
  echo "  ✅ hover:opacity-* (opacity changes)"
  echo "  ✅ hover:shadow-* (shadow changes)"
  echo "  ✅ hover:border-* (border color, not width)"
  echo ""
  echo "Prohibited hover effects:"
  echo "  ❌ hover:translate-* (position shifts)"
  echo "  ❌ hover:scale-* (size changes)"
  echo "  ❌ hover:m-* (margin changes)"
  echo "  ❌ hover:p-* (padding changes)"
  exit 1
fi
