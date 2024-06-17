class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }
    filter() {
        const queryObj = {...this.queryString}; // it will make a copy of req.query
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]); // it will remove unwanted fields
        
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

        this.query = this.query.find(JSON.parse(queryStr));

        return this; // to chain the sort method on filter() as filter() is now returning the object
    }
    sort() {
        if(this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' '); // comma ki jagah space daal do kyuki mongoose params sort ke space me leta hai string
            this.query = this.query.sort(sortBy);
        }
        else {
            this.query = this.query.sort('-createdAt'); // deafult sort by dec creation date -> recent tour is on top
        }
        return this; // to chain the methods below
    }
    limitFields() {
        if(this.queryString.fields) {
            // by writing select property to false in schema, mongoose will not send that field like password to query
            // url --> localhost:3000/api/v1/tours?fields=price,images
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields); // fields specified by spaces will be shown
        }
        else {
            this.query = this.query.select('-__v'); // this - sign indicate that remove this __v field and show all remaining
        }
        return this;
    }
    paginate() {
        // limit is the number of items on a page
        const page = this.queryString.page * 1 || 1; // -> deafult page = 1
        const limit = this.queryString.limit * 1 || 100; // -> default limit = 1
        const skip = (page - 1) * limit; // kitne skip krne hai
        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

module.exports = APIFeatures;