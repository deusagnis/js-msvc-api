module.exports = class MsvcApi
{
    proxy

    apiUrl
    msvcName

    objectName = null
    actionName = null

    dataToSend

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

    errorsHandler = (error) => console.log(error.name + ': ' + error.message)

    constructor (api,msvc)
    {
        this.apiUrl = api
        this.msvcName = msvc

        return this.asProxy()
    }

    asProxy(){
        this.proxy = this.createProxy()
        return this.proxy
    }

    createProxy(){
        let handler = {
            get: function (parent, prop)
            {
                if (typeof parent[prop] !== 'undefined')
                    return parent[prop]

                if(parent.isObjectCall()){
                    parent.setObjectName(prop)
                    parent.resetActionName()

                    return parent.proxy;
                }else if (parent.isActionCall()){
                    parent.setActionName(prop)

                    return parent.setDataToSend
                }
            }
        }

        return new Proxy(this, handler)
    }

    isObjectCall(){
        if(this.objectName === null || this.actionName !== null ){
            return true
        }

        return false
    }

    isActionCall(){
        if(this.objectName !== null && this.actionName === null){
            return true
        }

        return false
    }

    setObjectName(name){
        this.objectName = name
    }

    resetActionName(){
        this.actionName = null
    }

    setActionName(name){
        this.actionName = name
    }

    setDataToSend(data= null){
        this.dataToSend = data

        return this.proxy
    }


    get(){
        this.fetchSettings.method = this.getMethod
        this.removeRequestBody()

        return this.proxy
    }

    removeRequestBody(){
        if(this.fetchSettings['body'] !== undefined){
            delete this.fetchSettings['body']
        }
    }

    post(){
        this.fetchSettings.method = this.postMethod

        return this.proxy
    }

    form(){
        this.post()
        this.resetContentType()

        return this.proxy
    }

    json(){
        this.post()
        this.contentJson()

        return this.proxy
    }

    async send(){
        this.provideFileExistence()

        const target = this.createRequestTarget()
        this.provideBody()

        try{
            this.response = await fetch(target,this.fetchSettings)

            return await this.handleResponse()
        }catch (e){
            await this.errorsHandler(e)

            return false
        }
    }

    async handleResponse(){
        this.handleServerErrors()

        const decodedResponse = await this.response.json()

        this.handleResponseErrors(decodedResponse)

        return decodedResponse
    }

    handleServerErrors(){
        if(this.response.ok === false){
            throw new Error('Server error with code ' + this.response.status)
        }
    }

    handleResponseErrors(decodedResponse){
        if(decodedResponse['errors'] === undefined) return

        const responseError = decodedResponse['errors'].shift()

        throw new Error(responseError['mess'])
    }

    createRequestTarget(){
        let target = this.createRequestUrl()

        if(this.fetchSettings.method === this.getMethod){
            target += '?'
            target += this.createDataQuery()
        }

        return target
    }

    createDataQuery(){
        let params = new URLSearchParams(this.dataToSend)

        return params.toString()
    }

    createRequestUrl(){
        let parts = [this.apiUrl,this.msvcName]

        if(this.objectName !== this.msvcSelfObjectKey){
            parts.push(this.objectName)
        }

        parts.push(this.actionName)

        return parts.join('/')
    }

    provideFileExistence(){
        if(this.dataToSendWithoutFiles()) return

        this.form()
    }

    dataToSendWithoutFiles(){
        if(typeof this.dataToSend !== 'object') return true

        for (let key in this.dataToSend){
            if(this.dataToSend[key] instanceof File){
                return false
            }
        }

        return true
    }

    contentJson(){
        this.fetchSettings.headers['Content-Type'] = this.jsonContentType

        return this.proxy
    }

    resetContentType(){
        delete this.fetchSettings.headers['Content-Type']
    }


    provideBody(){
        if(this.fetchSettings.method !== this.postMethod) return

        const contentType = this.fetchSettings.headers['Content-Type']

        if(contentType === this.jsonContentType){
            this.fetchSettings.body = this.createJsonBody()
        }else{
            this.fetchSettings.body = this.createFormBody()
        }
    }

    createJsonBody(){
        return JSON.stringify(this.dataToSend)
    }

    createFormBody(){
        const formData = new FormData()

        for( let key in this.dataToSend){
            formData.append(key,this.dataToSend[key])
        }

        return formData
    }

}