const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const moment = require('moment');
require('dotenv').config();

  

const app = express();
const PORT = process.env.PORT || 3000

app.set('view engine', 'ejs');

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));



const db_username = process.env.DB_USERNAME;
const db_password = process.env.DB_PASSWORD;
const db_cluster_url = process.env.DB_CLUSTER_URL;
const db_name = process.env.DB_NAME;


const connectDB = async () => {
  try {
    const conn = await mongoose.connect(`mongodb+srv://${db_username}:${db_password}@${db_cluster_url}/${db_name}?retryWrites=true&w=majority`, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB Atlas:', conn.connection.host);
  } catch (error) {
    console.error('Error connecting to MongoDB Atlas:', error);
    process.exit(1);
  }
};





const uniformSchema = new mongoose.Schema({
  itemName: String,
  itemColour: String, // Define "itemColour" as a string
  house: String,
  total: Number,
  stePet: Number,
  che: Number
});

const Uniform = mongoose.model('Uniform', uniformSchema);

const locationSchema = new mongoose.Schema({
  house: {
    type: String,
    enum: ['stepet', 'che']
  }
});

const Location = mongoose.model('Location', locationSchema);




  app.get('/checkOnline', (req, res) => {
    console.log('Entered checkOnline route');
    res.status(200).send('Online');
});





app.get("/", function(req, res) {
  // Update the "itemColour" value for all documents in the "uniform" collection
  Uniform.updateMany({}, { $set: { itemColour: "info-subtle" } })
    .then(() => {
      // After updating, render the 'welcome' page
      res.render('welcome');
    })
    .catch(err => {
      console.error('Error updating itemColours:', err);
      res.status(500).send('Internal Server Error');
    });
});




app.post('/house', (req, res) => {
  const selectedHouse = req.body.house;

  // Update the "house" value in the existing document
  Location.findOneAndUpdate({}, { house: selectedHouse })
    .then(() => {
      res.redirect('index'); // Redirect to the home page or another page
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Internal Server Error');
    });
});




app.get('/index', function(req, res){
  console.log("Entering index route")
  Uniform.find({}, 'itemName itemColour')
  .sort({ number: 1 })  // Sort by 'number' in ascending order
  .then(data => {
    const itemNames = data.map(item => item.itemName);
    const itemColours = data.map(item => item.itemColour);

    // Log itemNames for debugging
    console.log('Item Names:', itemNames);
    console.log('Item Colour:', itemColours);

    res.render('index', { itemNames, itemColours });
  })
  .catch(err => {
    console.error(err);
    res.status(500).send('Internal Server Error');
  });
});


  
  

  



app.get('/detail', (req, res) => {
  const itemName = req.query.itemName;

   // Initialize the error message variable
   let errorMessage = '';

  // Find the document in the "uniform" collection with the specified "itemName"
  Uniform.findOne({ itemName: itemName }, 'total stePet che')
    .then(data => {
      if (data) {
        // Data found, log the values
        const { total, stePet, che } = data;
        console.log('Total:', total);
        console.log('StePet:', stePet);
        console.log('Che:', che);

        // Render the "detail" view and pass the values
        res.render('detail', { itemName, total, stePet, che, errorMessage });
      } else {
        // No data found for the given "itemName"
        console.log('No data found for itemName:', itemName);
        res.status(404).send('Not Found');
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Internal Server Error');
    });
});

    


    


app.get('/manifest.json', (req, res) => {
  res.sendFile(`${__dirname}/manifest.json`);
});

app.get('/service-worker.js', (req, res) => {
  res.sendFile(`${__dirname}/service-worker.js`);
});





app.get('/logo', (req, res) => {
  res.render('logo');
});





app.post("/detailmove", async function(req, res) {
  const itemName = req.body.itemName;
  const selectedWear = parseInt(req.body.wear) || 0; // Convert to number, default to 0 if not selected
  const selectedPack = parseInt(req.body.pack) || 0; // Convert to number, default to 0 if not selected
  console.log(itemName, selectedPack, selectedWear);

  // Find the document in the "uniform" collection with the specified "itemName"
  Uniform.findOne({ itemName: itemName }, 'total stePet che')
    .then(data => {
      if (data) {
        // Data found, log the values
        const { total, stePet, che } = data;
        console.log('Total:', total);
        console.log('StePet:', stePet);
        console.log('Che:', che);

        // Find the value of "house" in the "location" collection
        Location.findOne({}, 'house')
          .then(locationData => {
            if (locationData) {
              const house = locationData.house;
              console.log('House:', house);

              // Calculate selectedClothes based on selectedWear and selectedPack
              const selectedClothes = selectedWear + selectedPack;
              console.log('Selected clothes', selectedClothes);

              // Calculate newStePet and newChe
              let newStePet, newChe;

              if (house === 'che') {
                newStePet = stePet + selectedClothes;
                newChe = che - selectedClothes;
              } else {
                newStePet = stePet - selectedClothes;
                newChe = che + selectedClothes;
              }

              console.log('New StePet:', newStePet);
              console.log('New Che:', newChe);

              // Check if newStePet or newChe is less than 0
              if (newStePet < 0 || newChe < 0) {
                console.log('Invalid values');
                // Redirect to the detail page with an error message
                return res.redirect('/index');
              }

              // Update the "itemColour" value to "tertiary" in the "uniform" collection
              Uniform.updateOne(
                { itemName: itemName },
                { $set: { itemColour: "tertiary" } }
              )
                .then(() => {
                  // Update the document in the "uniform" collection with the new values
                  return Uniform.updateOne(
                    { itemName: itemName },
                    { $set: { stePet: newStePet, che: newChe } }
                  );
                })
                .then(() => {
                  // Redirect to the index page
                  res.redirect('/logo');
                })
                .catch(err => {
                  console.error("Error updating values:", err);
                  res.status(500).send("Internal Server Error");
                });
            } else {
              console.log('No data found in the "location" collection');
            }
          })
          .catch(err => {
            console.error('Error in locationData:', err);
          });
      } else {
        // No data found for the given "itemName"
        console.log('No data found for itemName:', itemName);
        res.status(404).send('Not Found');
      }
    });
});







  













   
    
  



connectDB().then(() => {
  app.listen(PORT, () => {
      console.log("listening for requests");
  })
})






