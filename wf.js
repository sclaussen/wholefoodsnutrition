'use strict'
// process.env.DEBUG = 'wf'
const fs = require('fs')
var YAML = require('js-yaml');

const d = require('debug')('wf')
const p = require('./lib/pr').p(d)
const p4 = require('./lib/pr').p4(d)

const _ = require('lodash')
const curl = require('./lib/curl')

main()

async function main() {
    let ingredients = YAML.load(fs.readFileSync('./ingredients.yaml', 'utf8'));
    let nutrientConfigs = YAML.load(fs.readFileSync('./nutrients.yaml', 'utf8'));

    for (let ingredient of ingredients) {

        if (ingredient.skip) {
            continue
        }

        // For the whole foods ingredient url page, retrieve the JSON
        // metadata on the ingredient from the web page.
        let body = (await curl.get(ingredient.url)).body
        body = body.replace(/<[^<]+>/g, "")
        body = body.replace(/\n/g, "")
        body = body.replace(/\n/g, "")
        body = body.replace(/\\/g, "")
        body = body.replace(/.+{"props":/g, "{\"props\":")
        body = body.replace(/"globalAlert.*$/, "")
        body = body.replace(/,$/, "}}}")

        // Deserialize the JSON and create a shortcut to the data
        // portion of the JSON
        let wholeFoods = JSON.parse(body)
        let wf = wholeFoods.props.pageProps.data
        p4(wf)


        // data will contain name/value information for all the
        // attributes that need to be pulled out of the whole foods
        // data structure
        let data = []


        // Add some high level name/value pairs
        data.push({ name: 'name', value: ingredient.name })
        data.push({ name: 'fullName', value: mapName(wf.name) })
        data.push({ name: 'url', value: ingredient.url })
        data.push({ name: 'brand', value: mapBrand(wf.brand.name) })
        data.push({ name: 'category', value: mapCategory(wf.categories.name) })


        // Add ingredients
        let ingredients = []
        for (let ingredient of wf.ingredients) {
            ingredient = ingredient.replace(/(?<=[^(]*\([^()]*),(?=[^)]*\))/g, ";")
            ingredient = ingredient.replace(/(?<=[^(]*\([^()]*)\.(?=[^)]*\))/g, "")
            ingredient = ingredient.replace(/(?<=[^\[]*\[[^\[\]]*),(?=[^\]]*\])/g, ";")
            ingredient = ingredient.replace(/(?<=[^\[]*\[[^\[\]]*)\.(?=[^\]]*\])/g, "")
            for (let separatedIngredient of ingredient.split(/,/)) {
                separatedIngredient = separatedIngredient.trim()
                separatedIngredient = separatedIngredient.replace(/Ingredients: /, "")
                separatedIngredient = separatedIngredient.replace(/\.$/, "")
                ingredients.push(separatedIngredient)
            }
        }
        data.push({ name: 'ingredients', value: ingredients })


        // Add allergens
        let allergens = []
        if (wf.allergens) {
            for (let allergen of wf.allergens) {
                allergens.push(allergen)
            }
        }
        data.push({ name: 'allergens', value: allergens })


        // Add consumptionUnit and consumptionGrams
        if (ingredient.consumptionUnit) {
            data.push({ name: 'consumptionUnit', value: ingredient.consumptionUnit })
            data.push({ name: 'consumptionGrams', value: ingredient.consumptionGrams })
        } else {
            data.push({ name: 'consumptionUnit', value: "grams" })
            data.push({ name: 'consumptionGrams', value: "1" })
        }


        // Add servingSize
        // If the servingSize is not defined in terms of grams (g/G),
        // use the ingredient's config metadata to convert the value
        // to grams
        let macroNutrientData = []
        let servingSize = wf.servingInfo.secondaryServingSize
        if (wf.servingInfo.secondaryServingSizeUom !== 'g' && wf.servingInfo.secondaryServingSizeUom !== 'G') {
            if (!ingredient['conversion_factor']) {
                console.error('ERROR: No conversion factor exists for ' + ingredient.name)
                process.exit(1)
            }
            servingSize *= ingredient.conversion_factor
        }
        data.push({ name: "servingSize", value: servingSize })


        // Add all the nutrients found in the nutrients configuration
        // file, and convert the unit of measure if required
        for (let nutrientConfig of nutrientConfigs) {

            let wholeFoodsNutrient = _.find(wf.nutritionElements, { name: nutrientConfig.name })
            if (!wholeFoodsNutrient) {
                continue
            }

            let amount = wholeFoodsNutrient.perServing

            // If the whole foods nutrient uses a different unit of
            // measure, verify that it's a known/expected uom, and
            // convert it, if required.
            if (wholeFoodsNutrient.uom !== nutrientConfig.unit) {
                if (wholeFoodsNutrient.uom !== nutrientConfig.alternate_unit.unit) {
                    console.error("ERROR: The Whole Foods nutrient's unit of measure is unknown!")
                    process.exit(1)
                }

                if (nutrientConfig.alternate_unit.conversion_factor) {
                    amount = amount * nutrientConfig.alternate_unit.conversion_factor
                }
            }

            data.push({ name: nutrientConfig.alias, value: amount })
        }


        // Add netcarbs to the macro nutrients
        let carbs = _.find(data, { name: 'carbohydrates' })
        let fiber = _.find(data, { name: 'fiber' })
        let fiberAmount = fiber ? fiber.value : 0
        if (carbs) {
            data.push({ name: "netCarbs", value: carbs.value - fiberAmount })
        }

        serialize(data)
        console.log()
    }
}

function mapCategory(category) {
    category = category.replace(/u0026/g, '&')
    return category
}

function mapName(name) {
    name = name.replace(/u0026/g, '&')
    return name
}

function mapBrand(brand) {
    if (brand == '365 BY WFM') return 'Whole Foods 365'
    if (brand == '365 Everyday Value®') return 'Whole Foods 365'
    if (brand == 'PRODUCE') return 'Whole Foods 365'
    if (brand == '365 by Whole Foods Market') return 'Whole Foods 365'
    if (brand == 'Whole Foods Market') return 'Whole Foods 365'
    if (brand == 'BHU FOODS') return 'Bhu Foods'
    if (brand == 'siggi\'s') return 'Siggi\'s'
    brand = brand.replace(/u0026/g, '&')
    return brand
}

function serialize(data) {
    p4(data)

    y(data, 'name', '', '- ')
    y(data, 'brand')
    y(data, 'fullName')
    y(data, 'url')
    y(data, 'totalCost')
    y(data, 'totalGrams')
    y(data, 'category')
    y(data, 'ingredients')
    y(data, 'allergens')

    y(data, 'consumptionUnit')
    y(data, 'consumptionGrams')

    y(data, 'servingSize')
    y(data, 'calories')
    y(data, 'fat')
    y(data, 'saturatedFat')
    y(data, 'transFat')
    y(data, 'polyunsaturatedFat')
    y(data, 'monounsaturatedFat')
    y(data, 'cholesterol')
    y(data, 'sodium')
    y(data, 'carbohydrates')
    y(data, 'fiber')
    y(data, 'sugar')
    y(data, 'addedSugar')
    y(data, 'sugarAlcohool')
    y(data, 'netCarbs')
    y(data, 'protein')

    y(data, 'omega3')
    y(data, 'zinc')
    y(data, 'vitaminK')
    y(data, 'vitaminE')
    y(data, 'vitaminD')
    y(data, 'vitaminC')
    y(data, 'vitaminB6')
    y(data, 'vitaminB12')
    y(data, 'vitaminA')
    y(data, 'thiamin')
    y(data, 'selenium')
    y(data, 'riboflavin')
    y(data, 'potassium')
    y(data, 'phosphorus')
    y(data, 'pantothenicAcid')
    y(data, 'niacin')
    y(data, 'manganese')
    y(data, 'magnesium')
    y(data, 'iron')
    y(data, 'folicAcid')
    y(data, 'folate')
    y(data, 'copper')
    y(data, 'calcium')
}

function y(list, name, def, prefix) {
    let pre = prefix || '  '

    let stanza = _.find(list, { name: name })
    if (stanza) {
        if (Array.isArray(stanza.value)) {
            console.log(pre + name + ':')
            for (let item of stanza.value) {
                console.log(pre + "- " + item)
            }
            return
        }

        if ("value" in stanza) {
            console.log(pre + name + ': ' + stanza.value)
        } else {
            console.log(pre + name + ': ' + def)
        }
        return
    }

    console.log(pre + name + ': ' + (def || '0'))
}
