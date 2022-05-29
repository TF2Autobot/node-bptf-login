const request = require('request-retry-dayjs');
const cheerio = require('cheerio');
const steamLogin = require('@tf2autobot/steam-openid-login');

// TODO: UPGRADE TO AXIOS

class BackpackTFLogin {
    constructor() {
        this.jar = request.jar();
    }

    /**
     * Sets cookies
     * @param {*} cookies An array of cookies
     */
    setCookies(cookies) {
        cookies.forEach((cookieStr) => {
            this.jar.setCookie(
                request.cookie(cookieStr),
                'https://steamcommunity.com'
            );
        });
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
        request(
            {
                method: 'GET',
                url: 'https://old.backpack.tf/developer/apikey/view',
                jar: this.jar,
                followAllRedirects: true,
            },
            function (err, response, body) {
                if (err) {
                    return callback(err);
                }

                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(body);

                if ($('input[value="Generate my API key"]').length !== 0) {
                    return callback(null, null);
                }

                const apiKey = $('input[type=text][readonly]').val();

                if (!apiKey) {
                    return callback(new Error('Could not find API key'));
                }

                callback(null, apiKey);
            }
        ).end();
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

        request(
            {
                method: 'POST',
                url: 'https://old.backpack.tf/developer/apikey/view',
                followAllRedirects: true,
                jar: this.jar,
                form: {
                    url: url,
                    comments: comment,
                    'user-id': userID,
                },
            },
            function (err, response, body) {
                if (err) {
                    return callback(err);
                }

                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(body);

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
            }
        ).end();
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

        request(
            {
                method: 'POST',
                url: 'https://old.backpack.tf/developer/apikey/revoke',
                followAllRedirects: true,
                jar: this.jar,
                form: {
                    identifier: '',
                    'user-id': userID,
                    confirm_apikey: apiKey,
                },
            },
            function (err, response, body) {
                if (err) {
                    return callback(err);
                }

                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(body);

                const alert = $('div.alert.alert-danger');

                if (alert.length !== 0) {
                    const error = alert.contents().last().text().trim();
                    return callback(
                        new Error(!error ? 'An error occurred' : error)
                    );
                }

                callback(null);
            }
        ).end();
    }

    /**
     * Gets settings
     * @param {Function} callback
     */
    getSettings(callback) {
        request(
            {
                method: 'GET',
                url: 'https://old.backpack.tf/settings',
                followAllRedirects: true,
                jar: this.jar,
            },
            function (err, response, body) {
                if (err) {
                    return callback(err);
                }

                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(body);

                const settingsSerialized = $('form#settings-form')
                    .serializeArray()
                    .filter((value) => value.name !== 'user-id');

                const settings = {};
                settingsSerialized.forEach((setting) => {
                    settings[setting.name] = setting.value;
                });

                callback(null, settings);
            }
        ).end();
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

        request(
            {
                method: 'POST',
                url: 'https://old.backpack.tf/settings',
                followAllRedirects: true,
                jar: this.jar,
                formData: form,
            },
            function (err, response, body) {
                if (err) {
                    return callback(err);
                }

                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(body);

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
            }
        ).end();
    }

    /**
     * Gets access token
     * @param {Function} callback
     */
    getAccessToken(callback) {
        request(
            {
                method: 'GET',
                url: 'https://old.backpack.tf/connections',
                followAllRedirects: true,
                jar: this.jar,
            },
            function (err, response, body) {
                if (err) {
                    return callback(err);
                }

                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(body);

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
            }
        ).end();
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

        request(
            {
                method: 'POST',
                url: 'https://old.backpack.tf/generate_token',
                followAllRedirects: true,
                jar: this.jar,
                form: {
                    'user-id': userID,
                },
            },
            function (err, response, body) {
                if (err) {
                    return callback(err);
                }

                if (response.request.uri.host === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const $ = cheerio.load(body);

                const form = $('form[action="/generate_token"]');
                const accessToken = form.find('input[type="text"]').val();

                callback(null, accessToken);
            }
        ).end();
    }

    _getUserID() {
        const cookies = this.jar.getCookies('https://old.backpack.tf');

        const userID = cookies.find((cookie) => cookie.key === 'user-id');

        return userID === undefined ? null : userID.value;
    }
}

module.exports = BackpackTFLogin;
