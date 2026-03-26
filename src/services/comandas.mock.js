export class ComandasMock {
    constructor() {
        this.comandas = [
            {
                id: "b75b3d12-b530e33b",
                status: "open",
                key: "comanda/558112345678",
                items: [
                    {
                        id: 1,
                        name: "Café",
                        unit: "u",
                        base_unit: "uni",
                        quantity: 2,
                        unit_price: 5,
                        total_price: 10
                    },
                    {
                        id: 2,
                        name: "Requeijão",
                        unit: "u",
                        base_unit: "uni",
                        quantity: 1,
                        unit_price: 20,
                        total_price: 20
                    },
                    {
                        id: 3,
                        name: "Tostado",
                        unit: "u",
                        base_unit: "uni",
                        quantity: 1,
                        unit_price: 20,
                        total_price: 20
                    }
                ],
                contact: {
                    lead_id: "123456789",
                    name: "Juan",
                    number: "558112345678@s.whatsapp.net",
                    number_normalized: "558112345678"
                }
            },
            {
                id: "b75b3d12-b530e33b",
                status: "open",
                key: "comanda/5511999999999",
                items: [
                    {
                        id: 1,
                        name: "Pão de queijo",
                        unit: "u",
                        base_unit: "uni",
                        quantity: 2,
                        unit_price: 5,
                        total_price: 10
                    },
                    {
                        id: 2,
                        name: "Queijo Coalho",
                        unit: "g",
                        base_unit: "kg",
                        quantity: 400,
                        unit_price: 50,
                        total_price: 20
                    },
                    {
                        id: 3,
                        name: "Fiambre defumado",
                        unit: "g",
                        base_unit: "kg",
                        quantity: 300,
                        unit_price: 20,
                        total_price: 60
                    }
                ],
                contact: {
                    lead_id: "123456789",
                    name: "Juan",
                    number: "551199999999@s.whatsapp.net",
                    number_normalized: "551199999999"
                }
            }
        ]
    }

    async getComanda(key) {
        const comanda = this.comandas.find(comanda => comanda.key === key)

        if (!comanda) {
            throw new Error("404 - Comanda no encontrada")
        }

        return comanda
    }

    async updateItem(key, itemId, updates) {
        const comanda = this.comandas.find(comanda => comanda.key === key)
        if (!comanda) throw new Error("404 - Comanda no encontrada")

        const itemIndex = comanda.items.findIndex(item => item.id === itemId)
        if (itemIndex === -1) throw new Error("404 - Item no encontrado")

        comanda.items[itemIndex] = {
            ...comanda.items[itemIndex],
            ...updates
        }

        return comanda.items[itemIndex]
    }
}