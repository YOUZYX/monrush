/**
 * Test script for new simplified MonadRush contract
 * Tests all contract functions with the new simplified architecture
 */

// Import the contract simulation functions
import { contractSimulator, validateContractAddresses } from './src/lib/contracts.ts';

console.log('🧪 Testing New Simplified MonadRush Contract');
console.log('===============================================\n');

// Validate contract addresses are set
console.log('📍 Validating contract addresses...');
const isValid = validateContractAddresses();

if (!isValid) {
  console.error('❌ Contract addresses not properly configured');
  process.exit(1);
}

console.log('✅ Contract addresses validated\n');

// Run all contract function tests
console.log('🎯 Running contract simulation tests...\n');

contractSimulator.testAllFunctions()
  .then((results) => {
    console.log('\n🎉 All tests completed!');
    console.log('\n📊 Summary:');
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    const failedTests = results.filter(r => !r.success);
    
    console.log(`Passed: ${passed}/${total}`);
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed tests:');
      failedTests.forEach(test => {
        console.log(`- ${test.function}: ${test.error?.message || 'Unknown error'}`);
      });
    }
    
    if (passed === total) {
      console.log('\n🎊 All contract functions are working correctly!');
    } else {
      console.log(`\n⚠️  ${failedTests.length} test(s) failed. Check configuration.`);
    }
  })
  .catch((error) => {
    console.error('❌ Contract testing failed:', error);
    process.exit(1);
  });
