# Client side API wrapper for laravel microservices

## About
This package make wrapping to fast and easy send requests to laravel microservice API from client side code.

## Usage
To install:

``
npm i @mggflow/msvc-api
``

Example:

```
let start = async () => {
    let api = new MsvcApi("url_of_microservice_api", "microservice_name")

    let resp = await api.it.hello({name: "World"}).send()
    if (resp.result) {
        console.log(resp.result)
    }else{
        api.handleResponseErrors(api.decodedResponse)
    }
}

start()
```