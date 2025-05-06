/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {

  },
  serverExternalPackages: [
    "@hyperledger/aries-askar-nodejs",
    "@hyperledger/anoncreds-nodejs",
    "jsonpath",
    "rdf-canonize",
    "rdf-canonize-native",
    "@digitalcredentials/jsonld",
    "@digitalcredentials/rdf-canonize",
    "@credo-ts/core",
    "@credo-ts/node",
    "@credo-ts/askar",
    "@credo-ts/anoncreds",
    "@credo-ts/cheqd",
    "@credo-ts/didcomm",
    "@credo-ts/tenants"
  ],
  transpilePackages: ['@tailwindcss/postcss'],
  webpack: (config, { isServer, webpack }) => {

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: isServer ? false : require.resolve('crypto-browserify'),
      stream: isServer ? false : require.resolve('stream-browserify'),
      http: false,
      https: false,
      zlib: false,
      path: false,
      os: false,
      util: require.resolve('util/'),
      events: require.resolve('events/'),
      url: require.resolve('url/'),
      querystring: require.resolve('querystring-es3'),
      buffer: require.resolve('buffer/'),
    };
    
    if (!isServer) {

      config.resolve.fallback = {
        ...config.resolve.fallback,
        process: require.resolve('process/browser'),
      };
    }
    

    if (webpack && webpack.ProvidePlugin) {
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    }
    
    return config;
  },
};

module.exports = nextConfig; 