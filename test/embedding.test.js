import axios from "axios"

async function testEmbedding() {
    const response = await axios.post("http://localhost:3000/api/produtos/embedding", {
        "id": 35
    })

    console.log(response.data)
}

testEmbedding()