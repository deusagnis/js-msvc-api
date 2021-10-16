class MsvcApi {
    proxy

    apiUrl
    msvcName

    objectName = null
    actionName = null

    params

    msvcSelfObjectKey = 'it'

    fetchSettings = {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        redirect: 'follow',
        headers: {},
    }

    jsonContentType = 'application/json'
    getMethod = 'GET'
    postMethod = 'POST'

    response

    preparingCallbacks = []

    constructor(api, msvc) {
        this.apiUrl = api
        this.msvcName = msvc

        return this.asProxy()
    }

    errorsHandler = (error) => console.log(error.name + ': ' + error.message)

    asProxy() {
        this.proxy = this.createProxy()
        return this.proxy
    }

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

    isObjectCall() {
        if (this.objectName === null || this.actionName !== null) {
            return true
        }

        return false
    }

    isActionCall() {
        if (this.objectName !== null && this.actionName === null) {
            return true
        }

        return false
    }

    setObjectName(name) {
        this.objectName = name
    }

    resetActionName() {
        this.actionName = null
    }

    setActionName(name) {
        this.actionName = name
    }

    setParams(data = null) {
        this.params = data

        return this.proxy
    }


    get() {
        this.fetchSettings.method = this.getMethod
        this.removeRequestBody()

        return this.proxy
    }

    removeRequestBody() {
        if (this.fetchSettings['body'] !== undefined) {
            delete this.fetchSettings['body']
        }
    }

    post() {
        this.fetchSettings.method = this.postMethod

        return this.proxy
    }

    form() {
        this.post()
        this.resetContentType()

        return this.proxy
    }

    json() {
        this.post()
        this.contentJson()

        return this.proxy
    }

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

    async prepareSending(){
        for(let preparingCallback of this.preparingCallbacks){
            await preparingCallback(this)
        }
    }

    async handleResponse() {
        this.handleServerErrors()

        const decodedResponse = await this.response.json()

        this.handleResponseErrors(decodedResponse)

        return decodedResponse
    }

    handleServerErrors() {
        if (this.response.ok === false) {
            throw new Error('Server error with code ' + this.response.status)
        }
    }

    handleResponseErrors(decodedResponse) {
        if (decodedResponse['errors'] === undefined) return

        const responseError = decodedResponse['errors'].shift()

        throw new Error(responseError['mess'])
    }

    createRequestTarget() {
        let target = this.createRequestUrl()

        if (this.fetchSettings.method === this.getMethod && this.params !== null) {
            target += '?'
            target += this.createDataQuery()
        }

        return target
    }

    createDataQuery() {
        let params = new URLSearchParams(this.params)

        return params.toString()
    }

    createRequestUrl() {
        let parts = [this.apiUrl, this.msvcName]

        if (this.objectName !== this.msvcSelfObjectKey) {
            parts.push(this.objectName)
        }

        parts.push(this.actionName)

        return parts.join('/')
    }

    provideFileExistence() {
        if (this.dataToSendWithoutFiles()) return

        this.form()
    }

    dataToSendWithoutFiles() {
        if (typeof this.params !== 'object') return true

        for (let key in this.params) {
            if (this.params[key] instanceof File) {
                return false
            }
        }

        return true
    }

    contentJson() {
        this.fetchSettings.headers['Content-Type'] = this.jsonContentType

        return this.proxy
    }

    resetContentType() {
        delete this.fetchSettings.headers['Content-Type']
    }


    provideBody() {
        if (this.fetchSettings.method !== this.postMethod) return

        const contentType = this.fetchSettings.headers['Content-Type']

        if (contentType === this.jsonContentType) {
            this.fetchSettings.body = this.createJsonBody()
        } else {
            this.fetchSettings.body = this.createFormBody()
        }
    }

    createJsonBody() {
        return JSON.stringify(this.params)
    }

    createFormBody() {
        const formData = new FormData()

        for (let key in this.params) {
            formData.append(key, this.params[key])
        }

        return formData
    }

}

export default MsvcApi