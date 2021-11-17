var path = require('path');

function srcPath(subdir) {
    return path.join(__dirname, "./", subdir);
}

module.exports = {
    // Change to your "entry-point".
    mode: 'production',
    optimization: {
		// We no not want to minimize our code.
		minimize: false
	},
    entry: {
        background: './src/background/index.ts',
        content: './src/content/content.ts'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    resolve: {
        alias: {
            '@mese/common': srcPath('../common/src'),
            '@mese/crypto': srcPath('../crypto'),
            '@mese/storage': srcPath('../storage'),
            '@mese/ui': srcPath('../ui')
        },
        extensions: ['.ts', '.tsx', '.js', '.json']
    },
    module: {
        rules: [
            {
                test: /\.(ts|js)x?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {}
                    }
                ]
            }
        ]
    }
};
