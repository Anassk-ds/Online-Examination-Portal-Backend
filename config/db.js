import mongoose from 'mongoose';
import dns from 'dns';

// Some ISPs/campus networks/routers block the DNS SRV record lookups that
// "mongodb+srv://" URIs require, even though normal DNS works fine for
// everything else. This forces Node to resolve via Google's public DNS
// instead of whatever the OS/router is configured to use, which fixes the
// "querySrv ECONNREFUSED" error without needing any Windows network settings
// changes.
dns.setServers(['8.8.8.8', '1.1.1.1']);

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is missing. Copy .env.example to .env and paste your MongoDB Atlas connection string.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};
