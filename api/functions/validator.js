/**
* @method
* @param {string} scope
* @param {request} req
* @return {object} error message
*
*/

function Validator() {}

Validator.prototype.validateData = function(scope, req) {

  switch(scope) {
    /**
    * @case
    * @param {string} signup
    *
    */
    case 'signup':
    req.sanitize('lastName').trim()
    req.checkBody({
      'firstName': {
        notEmpty: {
          errorMessage: 'First name cannot be empty'
        },
        matches: {
          options: ['^[a-zA-Z]+$', 'i'],
          errorMessage: 'Invalid First name'
        }
      },
      'lastName': {
        notEmpty: {
          errorMessage: 'Last name cannot be empty'
        },
        matches: {
          options: ['^[a-zA-Z ]*$', 'i'],
          errorMessage: 'Invalid Last name'
        }
      },
      'gender': {
        notEmpty: {
          errorMessage: 'Please select a gender'
        }
      },
    //   'phone': {
    //     optional: {
    //      options: [{ checkFalsy: true }]
    //    },
    //    isLength: {
    //     options: [5, 25],
    //     errorMessage: 'Phone number should be between 5 and 25 chars long'
    //   },
    //   matches: {
    //     options: ['^[+{1}][0-9()-]+$', 'i'],
    //     //options: ['^[0-9]+$', 'i'],
    //     errorMessage: 'Phone number should be only numbers and +, (, ), - signs with country code without spaces.'
    //   }      
    // },
    'location': {
      notEmpty: {
        errorMessage: 'Please select a valid location'
      }
    },
    'email': {
      notEmpty: {
        errorMessage: 'Email cannot be empty'
      },
      isEmail: {
        errorMessage: 'Email is invalid'
      }
    },
    'password': {
      notEmpty: {
        errorMessage: 'Password cannot be empty'
      },
      isLength: {
        options: [{ min: 6, max: 20 }],
        errorMessage: 'Password must be between 6 and 20 characters long'
      },
      matches: {
        options: ['(?=.*[0-9].*)(?=.*[a-zA-Z].*)(?=.*[@#$%^&*!~?`%_+=].*)', 'i'],
        errorMessage: 'Your password must have at least one digit, one character and a special character'
      }
    },
    'birthday': {
      notEmpty: {
        errorMessage: 'Please enter a valid Birthday. The field is incomplete or has an invalid date'
      },
      matches: {
        options: ['[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$', 'i'],
        errorMessage: 'Birthday is invalid'
      }
    }

  })
    break

    /**
    * @case
    * @param {string} changePassword
    *
    */
    case 'changePassword':
    req.checkBody({
      'password': {
        notEmpty: {
          errorMessage: 'Password cannot be empty'
        },
        isLength: {
          options: [{ min: 6, max: 20 }],
          errorMessage: 'Password must be between 6 and 20 characters long'
        },
        matches: {
          options: ['(?=.*[0-9].*)(?=.*[a-zA-Z].*)(?=.*[@#$%^&*!~?`%_+=].*)', 'i'],
          errorMessage: 'Your password must have at least one digit, one character and a special character'
        }
      },
      'confirmPassword': {
        notEmpty: {
          errorMessage: 'Please Confirm Password'
        },
        equals: {
          options : req.body.password,
          errorMessage: 'Password and confirm password does not match'
        }

      }
    })
    break

    /**
    * @case
    * @param {string} login
    *
    */
    case 'login' :
    req.checkBody({
      'email': {
        notEmpty: {
          errorMessage: 'Email cannot be empty'
        },
        isEmail: {
          errorMessage: 'Email is invalid'
        }
      },
      'password': {
        notEmpty: {
          errorMessage: 'Password cannot be empty'
        }  
      }

    })
    break


    /**
    * @case
    * @param {string} forgotPassword
    *
    */
    case 'forgotPassword' :
    req.checkBody({
      'email': {
        notEmpty: {
          errorMessage: 'Email cannot be empty'
        },
        isEmail: {
          errorMessage: 'Email is invalid'
        }
      }        
    })
    break


    /**
    * @case
    * @param {string} editProfile
    *
    */
    case 'editProfile':
    req.checkBody({
      'firstName': {
        notEmpty: {
          errorMessage: 'First name cannot be empty'
        },
        matches: {
          options: ['^[a-zA-Z]+$', 'i'],
          errorMessage: 'Invalid First name'
        }
      },
      'lastName': {
        notEmpty: {
          errorMessage: 'Last name cannot be empty'
        },
        matches: {
          options: ['^[a-zA-Z ]*$', 'i'],
          errorMessage: 'Invalid Last name'
        }
      },         
      'birthday': {
        notEmpty: {
          errorMessage: 'Please enter a valid Birthday. The field is incomplete or has an invalid date'
        },
        matches: {
          options: ['[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$', 'i'],
          errorMessage: 'Birthday is invalid'
        }
      },
      'bio': {
        notEmpty: {
          errorMessage: 'Bio cannot be empty'
        }
      }

    })
    break


    /**
    * @case
    * @param {string} photoComment
    *
    */
    case 'photoComment' :
    req.checkBody({
      'comment': {
        notEmpty: {
          errorMessage: 'Comment cannot be empty'
        }
      }        
    })
    break

    /**
    * @case
    * @param {string} block
    *
    */
    case 'block' :
    req.checkBody({
      'block_user_id': {
        notEmpty: {
          errorMessage: ' User id cannot be empty'
        }
      }        
    })
    break
      /**
    * @case
    * @param {string} firebase
    *
    */
    case 'firebase' :
    req.checkBody({
      'firebase_token': {
        notEmpty: {
          errorMessage: ' Firebase token cannot be empty'
        }
      }        
    })
    break
      /**
    * @case
    * @param {string} firebase
    *
    */
    case 'voipPush' :
    req.checkBody({
      'voip_token': {
        notEmpty: {
          errorMessage: ' Device token cannot be empty'
        }
      }        
    })
    break

     /**
    * @case
    * @param {string} SAVE SEARCH
    *
    */
    case 'saveSearch' :
    req.checkBody({
      'searchType': {
        notEmpty: {
          errorMessage: ' searchType cannot be empty'
        },
        isIn: {
          options: [['user', 'photo', 'album']],
          errorMessage: 'searchType is invalid'
        }
      },
      'searchItem': {
        notEmpty: {
          errorMessage: ' searchItem cannot be empty'
        },
        isMongoId: {
          errorMessage: ' searchItem is invalid'
        }
      }     
    })
    break
     /**
    * @case
    * @param {string} DELETE SEARCH
    *
    */
    case 'deleteSearch' :
    req.checkBody({
      'searchId': {
        notEmpty: {
          errorMessage: ' searchId cannot be empty'
        },
        isMongoId: {
          errorMessage: ' searchId is invalid'
        }
      }  
    })
    break


  }

}

module.exports = new Validator()