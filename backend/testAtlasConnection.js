const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function testAtlasConnection() {
    try {
        console.log('🧪 Testing MongoDB Atlas Connection...\n');

        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in .env file');
            console.log('\n📝 Steps to fix:');
            console.log('1. Create a .env file in the backend directory');
            console.log('2. Copy contents from .env.example');
            console.log('3. Update MONGODB_URI with your Atlas credentials\n');
            process.exit(1);
        }

        console.log('🔗 Connecting to MongoDB Atlas...');
        console.log(`📍 URI: ${MONGODB_URI.replace(/:[^:@]+@/, ':****@')}\n`);

        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
        });

        console.log('✅ Successfully connected to MongoDB Atlas!\n');
        console.log('📊 Connection Details:');
        console.log(`   Database: ${mongoose.connection.name}`);
        console.log(`   Host: ${mongoose.connection.host}`);
        console.log(`   Port: ${mongoose.connection.port || 'N/A (Atlas)'}`);
        console.log(`   Ready State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected'}\n`);

        // Test database operations
        console.log('🧪 Testing database operations...');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`✅ Found ${collections.length} collections:`);
        collections.forEach(col => {
            console.log(`   - ${col.name}`);
        });

        if (collections.length === 0) {
            console.log('\n📝 Database is empty. Run seed script to populate data.');
        }

        console.log('\n🎉 MongoDB Atlas connection test successful!');
        console.log('✅ Your RMS is ready to use MongoDB Atlas\n');

        await mongoose.connection.close();
        console.log('👋 Connection closed');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Connection Test Failed!');
        console.error('Error:', error.message);

        if (error.message.includes('authentication failed')) {
            console.log('\n💡 Authentication Error - Check:');
            console.log('   1. Username and password are correct');
            console.log('   2. Special characters in password are URL-encoded');
            console.log('   3. Database user has proper permissions');
        } else if (error.message.includes('ENOTFOUND')) {
            console.log('\n💡 Network Error - Check:');
            console.log('   1. Internet connection is active');
            console.log('   2. Cluster URL is correct');
            console.log('   3. Firewall allows MongoDB Atlas connections');
        } else if (error.message.includes('IP')) {
            console.log('\n💡 IP Whitelist Error - Check:');
            console.log('   1. Your IP is whitelisted in Atlas');
            console.log('   2. Or use 0.0.0.0/0 for testing (allow all IPs)');
        }

        console.log('\n📚 For more help, visit: https://www.mongodb.com/docs/atlas/\n');
        process.exit(1);
    }
}

testAtlasConnection();
