const { CookieJar } = require('tough-cookie');
const fetchCookie = require('fetch-cookie');
const cheerio = require('cheerio');
const steamLogin = require('@tf2autobot/steam-openid-login');

class BackpackTFLogin {
    constructor() {
        this.jar = new CookieJar();
        // Wrap the native global fetch to seamlessly handle cookies across redirects
        this.fetch = fetchCookie(fetch, this.jar);
    }

    /**
     * Sets cookies
     * @param {*} cookies An array of cookies
     */
    setCookies(cookies) {
        cookies.forEach((cookieStr) => {
            this.jar.setCookieSync(cookieStr, 'https://steamcommunity.com');
        });
    }

    /**
     * Signs in to backpack.tf
     * @param {*} callback
     */
    login(callback) {
        steamLogin('https://backpack.tf/login', this.jar, callback);
    }

    /**
     * Gets your API key
     * @param {Function} callback
     */
    getAPIKey(callback) {
        (async () => {
            try {
                const response = await this.fetch('https://backpack.tf/developer/apikey/view', {
                    method: 'GET',
                    redirect: 'follow',
                });

                if (new URL(response.url).hostname === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const body = await response.text();
                const $ = cheerio.load(body);

                if ($('input[value="Generate my API key"]').length !== 0) {
                    return callback(null, null);
                }

                const apiKey = $('input[type=text][readonly]').val();

                if (!apiKey) {
                    return callback(new Error('Could not find API key'));
                }

                callback(null, apiKey);
            } catch (err) {
                callback(err);
            }
        })();
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
            return callback(new Error('Not logged in'));
        }

        (async () => {
            try {
                const formData = new URLSearchParams();
                formData.append('url', url);
                formData.append('comments', comment);
                formData.append('user-id', userID);

                const response = await this.fetch('https://backpack.tf/developer/apikey/view', {
                    method: 'POST',
                    redirect: 'follow',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                if (new URL(response.url).hostname === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const body = await response.text();
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
            } catch (err) {
                callback(err);
            }
        })();
    }

    /**
     * Revokes / deletes API key
     * @param {String} apiKey Your API key
     * @param {Function} callback
     */
    revokeAPIKey(apiKey, callback) {
        const userID = this._getUserID();

        if (userID === null) {
            return callback(new Error('Not logged in'));
        }

        (async () => {
            try {
                const formData = new URLSearchParams();
                formData.append('identifier', '');
                formData.append('user-id', userID);
                formData.append('confirm_apikey', apiKey);

                const response = await this.fetch('https://backpack.tf/developer/apikey/revoke', {
                    method: 'POST',
                    redirect: 'follow',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                if (new URL(response.url).hostname === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const body = await response.text();
                const $ = cheerio.load(body);

                const alert = $('div.alert.alert-danger');

                if (alert.length !== 0) {
                    const error = alert.contents().last().text().trim();
                    return callback(
                        new Error(!error ? 'An error occurred' : error)
                    );
                }

                callback(null);
            } catch (err) {
                callback(err);
            }
        })();
    }

    /**
     * Gets settings
     * @param {Function} callback
     */
    getSettings(callback) {
        (async () => {
            try {
                const response = await this.fetch('https://backpack.tf/settings', {
                    method: 'GET',
                    redirect: 'follow',
                });

                if (new URL(response.url).hostname === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const body = await response.text();
                const $ = cheerio.load(body);

                const settingsSerialized = $('form#settings-form')
                    .serializeArray()
                    .filter((value) => value.name !== 'user-id');

                const settings = {};
                settingsSerialized.forEach((setting) => {
                    settings[setting.name] = setting.value;
                });

                callback(null, settings);
            } catch (err) {
                callback(err);
            }
        })();
    }

    /**
     * Updates settings
     * @param {Object} settings
     * @param {Function} callback
     */
    updateSettings(settings, callback) {
        const userID = this._getUserID();

        if (userID === null) {
            return callback(new Error('Not logged in'));
        }

        (async () => {
            try {
                const formData = new URLSearchParams();
                for (const key in settings) {
                    formData.append(key, settings[key]);
                }
                formData.append('user-id', userID);

                const response = await this.fetch('https://backpack.tf/settings', {
                    method: 'POST',
                    redirect: 'follow',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                if (new URL(response.url).hostname === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const body = await response.text();
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
            } catch (err) {
                callback(err);
            }
        })();
    }

    /**
     * Gets access token
     * @param {Function} callback
     */
    getAccessToken(callback) {
        (async () => {
            try {
                const response = await this.fetch('https://backpack.tf/connections', {
                    method: 'GET',
                    redirect: 'follow',
                });

                if (new URL(response.url).hostname === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const body = await response.text();
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
            } catch (err) {
                callback(err);
            }
        })();
    }

    /**
     * Generates a new access token making the old one invalid
     * @param {Function} callback
     */
    generateAccessToken(callback) {
        const userID = this._getUserID();

        if (userID === null) {
            return callback(new Error('Not logged in'));
        }

        (async () => {
            try {
                const formData = new URLSearchParams();
                formData.append('user-id', userID);

                const response = await this.fetch('https://backpack.tf/generate_token', {
                    method: 'POST',
                    redirect: 'follow',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                if (new URL(response.url).hostname === 'steamcommunity.com') {
                    return callback(new Error('Not logged in'));
                }

                const body = await response.text();
                const $ = cheerio.load(body);

                const form = $('form[action="/generate_token"]');
                const accessToken = form.find('input[type="text"]').val();

                callback(null, accessToken);
            } catch (err) {
                callback(err);
            }
        })();
    }

    _getUserID() {
        const cookies = this.jar.getCookiesSync('https://backpack.tf');
        const userID = cookies.find((cookie) => cookie.key === 'user-id');

        return userID === undefined ? null : userID.value;
    }
}

module.exports = BackpackTFLogin;