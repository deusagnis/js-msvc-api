class MsvcApi {
    /**
     * Proxy of object.
     */
    proxy

    /**
     * Url for requests to API.
     */
    apiUrl
    /**
     * Name of microservice.
     */
    msvcName

    /**
     * Name of API entity.
     */
    objectName = null
    /**
     * Name of API action.
     */
    actionName = null

    /**
     * Params of request.
     */
    params

    /**
     * Entity name if action belongs to microservice.
     * @type {string}
     */
    msvcSelfObjectKey = 'it'

    /**
     * Fetch method settings.
     */
    fetchSettings = {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        redirect: 'follow',
        headers: {},
    }

    /**
     * Request content type for JSON.
     * @type {string}
     */
    jsonContentType = 'application/json'
    /**
     * Method for GET requests.
     * @type {string}
     */
    getMethod = 'GET'
    /**
     * Method for POST requests.
     * @type {string}
     */
    postMethod = 'POST'

    /**
     * Received response.
     */
    response
    /**
     * Decoded received response.
     */
    decodedResponse

    /**
     * Callbacks executed before send request.
     */
    preparingCallbacks = []

    /**
     * @param api {string}
     * @param msvc {string}
     * @returns {MsvcApi}
     */
    constructor(api, msvc) {
        this.apiUrl = api
        this.msvcName = msvc

        return this.asProxy()
    }

    /**
     * Method for handling API errors.
     * @param error
     */
    errorsHandler = (error) => console.log(error.name + ': ' + error.message)

    /**
     * Make Proxy handler for MsvcApi object.
     * @returns {MsvcApi}
     */
    asProxy() {
        this.proxy = this.createProxy()
        return this.proxy
    }

    /**
     * Add handlers.
     * @returns {MsvcApi}
     */
    createProxy() {
        let handler = {
            get: function (parent, prop) {
                if (typeof parent[prop] !== 'undefined')
                    return parent[prop]

                if (parent.isObjectCall()) {
                    parent.setObjectName(prop)
                    parent.resetActionName()

                    return parent.proxy;
                } else if (parent.isActionCall()) {
                    parent.setActionName(prop)

                    return parent.setParams
                }
            }
        }

        return new Proxy(this, handler)
    }

    /**
     * Check if call of object.
     * @returns {boolean}
     */
    isObjectCall() {
        if (this.objectName === null || this.actionName !== null) {
            return true
        }

        return false
    }

    /**
     * Check if call of action.
     * @returns {boolean}
     */
    isActionCall() {
        if (this.objectName !== null && this.actionName === null) {
            return true
        }

        return false
    }

    /**
     * Setter for API entity name.
     * @param name
     */
    setObjectName(name) {
        this.objectName = name
    }

    /**
     * Remove API action name.
     */
    resetActionName() {
        this.actionName = null
    }

    /**
     * Setter for API action name.
     * @param name
     */
    setActionName(name) {
        this.actionName = name
    }

    /**
     * Set request params.
     * @param data
     * @returns {MsvcApi}
     */
    setParams(data = null) {
        this.params = data

        return this.proxy
    }

    /**
     * Set request method as GET.
     * @returns {MsvcApi}
     */
    get() {
        this.fetchSettings.method = this.getMethod
        this.removeRequestBody()

        return this.proxy
    }

    /**
     * Remove request body from fetch settings.
     */
    removeRequestBody() {
        if (this.fetchSettings['body'] !== undefined) {
            delete this.fetchSettings['body']
        }
    }

    /**
     * Set request method as POST.
     * @returns {MsvcApi}
     */
    post() {
        this.fetchSettings.method = this.postMethod

        return this.proxy
    }

    /**
     * Set request type as FORM.
     * @returns {MsvcApi}
     */
    form() {
        this.post()
        this.resetContentType()

        return this.proxy
    }

    /**
     * Set request type as JSON.
     * @returns {MsvcApi}
     */
    json() {
        this.post()
        this.contentJson()

        return this.proxy
    }

    /**
     * Send request.
     * @returns {Promise<boolean|*>}
     */
    async send() {
        await this.prepareSending()

        this.provideFileExistence()

        const target = this.createRequestTarget()
        this.provideBody()

        try {
            this.response = await fetch(target, this.fetchSettings)

            return await this.handleResponse()
        } catch (e) {
            await this.errorsHandler(e)

            return false
        }
    }

    /**
     * Apply preparing callbacks.
     * @returns {Promise<void>}
     */
    async prepareSending(){
        for(let preparingCallback of this.preparingCallbacks){
            await preparingCallback(this)
        }
    }

    /**
     * Handle microservice response.
     * @returns {Promise<*>}
     */
    async handleResponse() {
        this.handleServerErrors()

        this.decodedResponse = await this.response.json()

        this.handleResponseErrors()

        return this.decodedResponse
    }

    /**
     * Handle HTTP error of request.
     */
    handleServerErrors() {
        if (this.response.ok === false) {
            throw new Error('Server error with code ' + this.response.status)
        }
    }

    /**
     * Handle errors of microservice response.
     */
    handleResponseErrors() {
        if (this.decodedResponse['errors'] === undefined) return

        if(Array.isArray(this.decodedResponse['errors']) && this.decodedResponse['errors'].length){
            const responseError = this.decodedResponse['errors'][0] ?? {mess: 'Failed to recognize API error'}

            throw new Error(responseError['message'] ?? responseError['mess'] ?? 'Unexpected Error')
        }
    }

    /**
     * Create request target url.
     * @returns {string}
     */
    createRequestTarget() {
        let target = this.createRequestUrl()

        if (this.fetchSettings.method === this.getMethod && this.params !== null) {
            target += '?'
            target += this.createDataQuery()
        }

        return target
    }

    /**
     * Create request query from params.
     * @returns {string}
     */
    createDataQuery() {
        let params = new URLSearchParams(this.params)

        return params.toString()
    }

    /**
     * Create full request url.
     * @returns {string}
     */
    createRequestUrl() {
        let parts = [this.apiUrl, this.msvcName]

        if (this.objectName !== this.msvcSelfObjectKey) {
            parts.push(this.objectName)
        }

        parts.push(this.actionName)

        return parts.join('/')
    }

    /**
     * Change request type if exist file in request params.
     */
    provideFileExistence() {
        if (this.dataToSendWithoutFiles()) return

        this.form()
    }

    /**
     * Check if request params contents File.
     * @returns {boolean}
     */
    dataToSendWithoutFiles() {
        if (typeof this.params !== 'object') return true

        for (let key in this.params) {
            if (this.params[key] instanceof File) {
                return false
            }
        }

        return true
    }

    /**
     * Set request content type for JSON.
     * @returns {MsvcApi}
     */
    contentJson() {
        this.fetchSettings.headers['Content-Type'] = this.jsonContentType

        return this.proxy
    }

    /**
     * Remove content type from fetch settings.
     */
    resetContentType() {
        delete this.fetchSettings.headers['Content-Type']
    }

    /**
     * Provide request body.
     */
    provideBody() {
        if (this.fetchSettings.method !== this.postMethod) return

        const contentType = this.fetchSettings.headers['Content-Type']

        if (contentType === this.jsonContentType) {
            this.fetchSettings.body = this.createJsonBody()
        } else {
            this.fetchSettings.body = this.createFormBody()
        }
    }

    /**
     * Create body for JSON request.
     * @returns {string}
     */
    createJsonBody() {
        return JSON.stringify(this.params)
    }

    /**
     * Create body for FORM request.
     * @returns {FormData}
     */
    createFormBody() {
        const formData = new FormData()

        for (let key in this.params) {
            formData.append(key, this.params[key])
        }

        return formData
    }

}

export default MsvcApi