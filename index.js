const axios = require('axios').default;
const tough = require('tough-cookie');
const wrapper = require('axios-cookiejar-support').wrapper;

const cheerio = require('cheerio');
const steamLogin = require('@tf2autobot/steam-openid-login');

class BackpackTFLogin {
    constructor() {
        this.jar = new tough.CookieJar();
    }

    /**
     * Sets cookies
     * @param {*} cookies An array of cookies
     */
    setCookies(cookies) {
        cookies.forEach((cookieStr) => {
            const cookie = tough.Cookie.parse(cookieStr);
            this.jar.setCookieSync(cookie, 'https://steamcommunity.com');
        });

        this.client = wrapper(axios.create({ jar: this.jar }));
    }

    /**
     * Signs in to backpack.tf
     * @param {*} callback
     */
    login(callback) {
        steamLogin('https://old.backpack.tf/login', this.jar, callback);
    }

    /**
     * Gets your API key
     * @param {Function} callback
     */
    getAPIKey(callback) {
        this.client({
            method: 'GET',
            url: 'https://old.backpack.tf/developer/apikey/view',
        })
            .then((response) => {
                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(response.data);

                if ($('input[value="Generate my API key"]').length !== 0) {
                    return callback(null, null);
                }

                const apiKey = $('input[type=text][readonly]').val();

                if (!apiKey) {
                    return callback(new Error('Could not find API key'));
                }

                callback(null, apiKey);
            })
            .catch((err) => {
                if (err) {
                    return callback(err);
                }
            });
    }

    /**
     * Generates a new API key
     * @param {String} url
     * @param {String} comment
     * @param {Function} callback
     */
    generateAPIKey(url, comment, callback) {
        const userID = this._getUserID();

        if (userID === null) {
            callback(new Error('Not logged in'));
            return;
        }

        this.client({
            method: 'POST',
            url: 'https://old.backpack.tf/developer/apikey/view',
            data: {
                url: url,
                comments: comment,
                'user-id': userID,
            },
        })
            .then((response) => {
                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(response.data);

                const alert = $('div.alert.alert-danger');

                if (alert.length !== 0) {
                    const error = alert.contents().last().text().trim();
                    return callback(
                        new Error(!error ? 'An error occurred' : error)
                    );
                }

                const apiKey = $('input[type=text][readonly]').val();

                if (!apiKey) {
                    return callback(new Error('Could not find API key'));
                }

                callback(null, apiKey);
            })
            .catch((err) => {
                if (err) {
                    return callback(err);
                }
            });
    }

    /**
     * Revokes / deletes API key
     * @param {String} apiKey Your API key
     * @param {Function} callback
     */
    revokeAPIKey(apiKey, callback) {
        const userID = this._getUserID();

        if (userID === null) {
            callback(new Error('Not logged in'));
            return;
        }

        this.client({
            method: 'POST',
            url: 'https://old.backpack.tf/developer/apikey/revoke',
            data: {
                identifier: '',
                'user-id': userID,
                confirm_apikey: apiKey,
            },
        })
            .then((response) => {
                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(response.data);

                const alert = $('div.alert.alert-danger');

                if (alert.length !== 0) {
                    const error = alert.contents().last().text().trim();
                    return callback(
                        new Error(!error ? 'An error occurred' : error)
                    );
                }

                callback(null);
            })
            .catch((err) => {
                if (err) {
                    return callback(err);
                }
            });
    }

    /**
     * Gets settings
     * @param {Function} callback
     */
    getSettings(callback) {
        this.client({
            method: 'GET',
            url: 'https://old.backpack.tf/settings',
        })
            .then((response) => {
                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(response.data);

                const settingsSerialized = $('form#settings-form')
                    .serializeArray()
                    .filter((value) => value.name !== 'user-id');

                const settings = {};
                settingsSerialized.forEach((setting) => {
                    settings[setting.name] = setting.value;
                });

                callback(null, settings);
            })
            .catch((err) => {
                if (err) {
                    return callback(err);
                }
            });
    }

    /**
     * Updates settings
     * @param {Object} settings
     * @param {Function} callback
     */
    updateSettings(settings, callback) {
        const userID = this._getUserID();

        if (userID === null) {
            callback(new Error('Not logged in'));
            return;
        }

        const form = Object.assign({}, settings);
        form['user-id'] = userID;

        this.client({
            method: 'POST',
            url: 'https://old.backpack.tf/settings',
            data: form,
        })
            .then((response) => {
                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(response.data);

                const alert = $('div.alert.alert-warning');

                if (alert.length !== 0) {
                    const warnings = [];

                    alert.find('li').each((index, element) => {
                        warnings.push($(element).text());
                    });

                    return callback(new Error(warnings.join(' ')));
                }

                const settingsSerialized = $('form#settings-form')
                    .serializeArray()
                    .filter((value) => value.name !== 'user-id');

                const settings = {};
                settingsSerialized.forEach((setting) => {
                    settings[setting.name] = setting.value;
                });

                callback(null, settings);
            })
            .catch((err) => {
                if (err) {
                    return callback(err);
                }
            });
    }

    /**
     * Gets access token
     * @param {Function} callback
     */
    getAccessToken(callback) {
        this.client({
            method: 'GET',
            url: 'https://old.backpack.tf/connections',
        })
            .then((response) => {
                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(response.data);

                const alert = $('div.alert.alert-danger');

                if (alert.length !== 0) {
                    const error = alert.contents().last().text().trim();
                    return callback(
                        new Error(!error ? 'An error occurred' : error)
                    );
                }

                const form = $('form[action="/generate_token"]');
                const accessToken = form.find('input[type="text"]').val();

                callback(null, accessToken);
            })
            .catch((err) => {
                if (err) {
                    return callback(err);
                }
            });
    }

    /**
     * Generates a new access token making the old one invalid
     * @param {Function} callback
     */
    generateAccessToken(callback) {
        const userID = this._getUserID();

        if (userID === null) {
            callback(new Error('Not logged in'));
            return;
        }

        this.client({
            method: 'POST',
            url: 'https://old.backpack.tf/generate_token',
            data: {
                'user-id': userID,
            },
        })
            .then((response) => {
                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(response.data);

                const form = $('form[action="/generate_token"]');
                const accessToken = form.find('input[type="text"]').val();

                callback(null, accessToken);
            })
            .catch((err) => {
                if (err) {
                    return callback(err);
                }
            });
    }

    _getUserID() {
        const cookies = this.jar.getCookiesSync('https://old.backpack.tf');

        const userID = cookies.find((cookie) => cookie.key === 'user-id');

        return userID === undefined ? null : userID.value;
    }
}

module.exports = BackpackTFLogin;
