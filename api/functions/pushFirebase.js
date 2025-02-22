/**
* @file
* @desc Firebase functions
* @author Jins
* @date 06 July 2020
*
*/
var common = require('./common.js')
var db = require('../database/mongodb.js')
function PushFirebase() {};

/**
* @method
* @param {string} type -set Firebase Notification and push
* @param {string} code
* @param {object} data
* @return {object} response
*
*/
PushFirebase.prototype.firebaseNotification = function(input) {
    var notificationObject = {   
      	notification_type: input.type,
      	user_id: input.user_id,
   	}
   	// Get user details
   	var users = db.get().collection('users')
   	console.log("hloo")
   	users.find({ "_id" : notificationObject.user_id }, {"profile_image" : 1,"name":1,"firebase":1}).toArray(function(err, result){
      	if(err)
         	throw err
      	notificationObject.image = result[0].profile_image.thumbnail.small
      	notificationObject.user_name = result[0].name.first
        console.log("hloooottr",result[0].hasOwnProperty("firebase"))
        if(result[0].hasOwnProperty("firebase")){
            console.log("inside firebase")
            var firebaseRegToken = result[0].firebase.token || ""
            if(firebaseRegToken){
               	console.log("inside firebaseRegToken")
               	switch(notificationObject.notification_type){
               		case "follow"://follow.js
               			getUserDetails(input.followed_user_id,function(result){
		            		if(result){
		               		   	var message_notification = {
				                    notification: {
				                        body: result.name.first +" started following you"
				                    },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
								      		aps: {
										      	sound: "default",
										      	category: "Notification"
								      		},
								    	},
								  	},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                })
				            }
		            	}) 
		            	break
		            case "unfollow"://follow.js
		            	getUserDetails(input.followed_user_id,function(result){
		            		if(result){
		               		   	var message_notification = {
				                    notification: {
				                        body: result.name.first +" unfollowed you"
				                    },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
								      		aps: {
										      	sound: "default",
										      	category: "Notification"
								      		},
								    	},
								  	},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                }) 
				            }
		            	}) 
		                break
		            case "chatmessage"://chat.js
		            	getUserDetails(input.senderId,function(result){
		            		if(result){
			            		getBadgeNum(input.user_id, function(bnum){

			            			var message_notification = {
					                    notification: {
					                        title: result.name.first +":",
					                        body: result.name.first +": "+input.message,
					                    },
									  	android: {
										    ttl: 3600 * 1000,
										    notification: {
										      	icon: 'stock_ticker_update'
										    },
										    data:{
										    	category: "Chat",
										    	badge: bnum.badge.toString()								    	
										    }
									  	},
									  	apns: {
										    payload: {
										      	aps: {
											      	sound: "default",
											      	category: "Chat",
											        badge: bnum.badge
										      	},
										    },
									  	},
									  	data: {
										  	userId : result._id.toString(),
										  	userName : result.name.first+" "+result.name.last,
										  	profile_image : result.profile_image.thumbnail.small
										},								  
									  	token: firebaseRegToken
			                  		};
					                common.sendPushNotification({
					                    firebaseRegToken: firebaseRegToken,
					                    message_notification: message_notification,
					                }) 

			            		})
		            		}		            		
		            	}) 
		                break
		            case "like"://memmbles.js
		            	getUserDetails(input.liked_user_id,function(result){
		            		if(result){
				            	var message_notification = {
						            notification: {
						                title: "Memmbles",
						                body: result.name.first +" liked your album"
						            },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
								      		aps: {
										      	sound: "default",
										      	category: "Notification"
								      		},
								    	},
								  	},
								  	token: firebaseRegToken
				                };
						        common.sendPushNotification({
						        	firebaseRegToken: firebaseRegToken,
						            message_notification: message_notification,
						        })
						    }
		            	})  		            			
		                break
		            case "unlike"://memmbles.js
		            	getUserDetails(input.liked_user_id,function(result){
		            		if(result){
				            	var message_notification = {
						            notification: {
						                title: "Memmbles",
						                body: result.name.first +" unliked your album"
						            },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
								      		aps: {
										      	sound: "default",
										      	category: "Notification"
								      		},
								    	},
								  	},
								  	token: firebaseRegToken
				                };
						        common.sendPushNotification({
						        	firebaseRegToken: firebaseRegToken,
						            message_notification: message_notification,
						        })
						    }
		            	}) 		            			
		                break
		            case "tag"://memmbles.js
		            	getUserDetails(input.memmble_user_id,function(result){
		            		if(result){
				            	var message_notification = {
						            notification: {
						                title: "Memmbles",
						                body: result.name.first +" tagged you in a post"
						            },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
								      		aps: {
										      	sound: "default",
										      	category: "Notification"
								      		},
								    	},
								  	},
								  	token: firebaseRegToken
				                };
						        common.sendPushNotification({
						        	firebaseRegToken: firebaseRegToken,
						            message_notification: message_notification,
						        })
						    }
		            	}) 		            			
		                break
		            case "allFollowers"://memmbles.js
		            	getUserDetails(input.memmble_user_id,function(result){
		            		if(result){
				            	var message_notification = {
						            notification: {
						                title: "Memmbles",
						                body: result.name.first +" has added a new memmble "+input.album_title
						            },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
								      		aps: {
										      	sound: "default",
										      	category: "Notification"
									      	},
								    	},
								  	},
								  	token: firebaseRegToken
				                };
						        common.sendPushNotification({
						        	firebaseRegToken: firebaseRegToken,
						            message_notification: message_notification,
						        })
						    }
		            	}) 		            			
		                break 
		            case "allFollowersUpdate"://memmbles.js
		            	getUserDetails(input.memmble_user_id,function(result){
		            		if(result){
				            	var message_notification = {
						            notification: {
						                title: "Memmbles",
						                body: result.name.first +" has updated the memmble "+input.album_title
						            },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
									      	aps: {
										      	sound: "default",
										      	category: "Notification"
									      	},
								    	},
								  	},
								  	token: firebaseRegToken
				                };
						        common.sendPushNotification({
						        	firebaseRegToken: firebaseRegToken,
						            message_notification: message_notification,
						        })
						    }
		            	}) 		            			
		                break
		            case "photo_comment"://comment.js
		            	getUserDetails(input.commented_user_id,function(result){
		            		if(result){
				            	var message_notification = {
						            notification: {
						                title: "Memmbles",
						                body: result.name.first +" has commented on the memmble "+input.album_title
						            },
								  	android: {
								    	ttl: 3600 * 1000,
								    	notification: {
								      		icon: 'stock_ticker_update'
								    	},
								    	data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
								      		aps: {
										      	sound: "default",
										      	category: "Notification"
								      		},
								    	},
								  	},
								  	token: firebaseRegToken
				                };
						        common.sendPushNotification({
						        	firebaseRegToken: firebaseRegToken,
						            message_notification: message_notification,
						        })
						    }
		            	}) 		            			
		                break
		            case "video_comment"://comment.js
		            	getUserDetails(input.commented_user_id,function(result){
		            		if(result){
				            	var message_notification = {
						            notification: {
						                title: "Memmbles",
						                body: result.name.first +" has commented on the memmble "+input.album_title
						            },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
									      	aps: {
										      	sound: "default",
										      	category: "Notification"
									      	},
								    	},
								  	},
								  	token: firebaseRegToken
				                };
						        common.sendPushNotification({
						        	firebaseRegToken: firebaseRegToken,
						            message_notification: message_notification,
						        })
						    }
		            	}) 		            			
		                break
		            case "chat_invite"://chat.js
		            	getUserDetails(input.senderId,function(result){
		            		if(result){
		            			var message_notification = {
				                    notification: {
				                        title: "Memmbles",
				                        body: result.name.first +" has sent you a chat request"
				                    },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
								      		aps: {
										      	sound: "default",
										      	category: "Notification"
								      		},
								    	},
								  	},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                }) 
		            		}
		            	}) 
		                break 
		            case "tree_share"://familyTree.js
		            	getUserDetails(input.senderId,function(result){
		            		if(result){
		            			var message_notification = {
				                    notification: {
				                        title: "Memmbles",
				                        body: result.name.first +" has shared a Familytree"
				                    },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
								      		aps: {
										      	sound: "default",
										      	category: "Notification"
								      		},
								    	},
								  	},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                }) 
		            		}
		            	}) 
		                break
		            case "chat_invite_accepted"://chat.js
		            	getUserDetails(input.senderId,function(result){
		            		if(result){
		            			var message_notification = {
				                    notification: {
				                        title: "Memmbles",
				                        body: result.name.first +" has accepted the chat request"
				                    },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
									      	aps: {
										      	sound: "default",
										      	category: "Notification"
									      	},
								    	},
								  	},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                }) 
		            		}
		            	}) 
		                break 
		            case "chat_invite_accepted_by_user"://chat.js
		            	getUserDetails(input.senderId,function(result){
		            		if(result){
		            			var message_notification = {
				                    notification: {
				                        title: "Memmbles",
				                        body: "You have accepted chat request sent by "+result.name.first
				                    },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
									    payload: {
									      	aps: {
										      	sound: "default",
										      	category: "Notification"
									      	},
									    },
								  	},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                }) 
		            		}
		            	}) 
		                break
		            case "chatImg"://chat.js
		            	getUserDetails(input.senderId,function(result){
		            		if(result){
		            			getBadgeNum(input.user_id, function(bnum){
			            			var message_notification = {
					                    notification: {
					                        title: result.name.first +":",
					                        body: result.name.first +" sent you a photo"				                        
					                    },
									  	android: {
										    ttl: 3600 * 1000,
										    notification: {
										      icon: 'stock_ticker_update'
										    },
											data: {
											    category: "Chat",
											    badge: bnum.badge.toString()								    	
											}
										  },
										apns: {
										    payload: {
										      	aps: {
											      	sound: "default",
											      	category: "Chat",
											        badge: bnum.badge
										      	},									      
										    },
									  	},
									  	data: {
										  	userId : result._id.toString(),
										  	userName : result.name.first+" "+result.name.last,
										  	profile_image : result.profile_image.thumbnail.small
										},								  
									  	token: firebaseRegToken
			                  		};
					                common.sendPushNotification({
					                    firebaseRegToken: firebaseRegToken,
					                    message_notification: message_notification,
					                }) 
				            	})
		            		}
		            	}) 
		                break 
		            case "chatVdo"://chat.js
		            	getUserDetails(input.senderId,function(result){
		            		if(result){
		            			getBadgeNum(input.user_id, function(bnum){
			            			var message_notification = {
					                    notification: {
					                        title: result.name.first +":",
					                        body: result.name.first +" sent you a video"
					                    },
									  	android: {
										    ttl: 3600 * 1000,
										    notification: {
										      	icon: 'stock_ticker_update'
										    },
										    data: {
												category: "Chat",
												badge: bnum.badge.toString()								    	
											}
									  	},
									  	apns: {
									    	payload: {
									      		aps: {
											      	sound: "default",
											      	category: "Chat",
											        badge: bnum.badge
										      	},								      
									   		},
									 	},
									  	data: {
										  	userId : result._id.toString(),
										  	userName : result.name.first+" "+result.name.last,
										  	profile_image : result.profile_image.thumbnail.small
										  },
									  	token: firebaseRegToken
			                  		};
					                common.sendPushNotification({
					                    firebaseRegToken: firebaseRegToken,
					                    message_notification: message_notification,
					                }) 
				            	})
		            		}
		            	}) 
		                break
		            case "tree_share_accepted"://familyTree.js
		            	getUserDetails(input.senderId,function(result){
		            		if(result){
		            			var message_notification = {
				                    notification: {
				                        title: "Memmbles",
				                        body: result.name.first +" has accepted the Familytree request"
				                    },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								 	 apns: {
									    payload: {
									      	aps: {
										      	sound: "default",
										      	category: "Notification"
										    },
									    },
								  	},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                }) 
		            		}
		            	}) 
		                break 
		            case "tree_share_accepted_by_user"://familyTree.js
		            	getUserDetails(input.senderId,function(result){
		            		if(result){
		            			var message_notification = {
				                    notification: {
				                        title: "Memmbles",
				                        body: "You have accepted Familytree request sent by "+result.name.first
				                    },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
									},
									apns: {
									    payload: {
									      	aps: {
										      	sound: "default",
										      	category: "Notification"
									      	},
									    },
								  	},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                }) 
		            		}
		            	}) 
		                break
		            case "birthday"://bdaylist.js
		            	getUserDetails(input.birthday_user_id,function(result){
		            		if(result){
		            			var message_notification = {
				                    notification: {
				                        title: "Memmbles",
				                        body: "🎂 Today is "+result.name.first+" "+result.name.last+"'s birthday"
				                    },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
									    payload: {
									      	aps: {
										      	sound: "default",
										      	category: "Notification"
									      	},
									    },
								  	},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                }) 
		            		}
		            	}) 
		                break 
		            case "adminwishes"://admBirthwish.js
		            	getUserDetails(input.user_id,function(result){
		            		if(result){
		            			var message_notification = {
				                    notification: {
				                        title: "Memmbles",
				                        body: "Memmbles wishing you a very Happy Birthday🎂"
				                    },
								  	android: {
									    ttl: 3600 * 1000,
									    notification: {
									      	icon: 'stock_ticker_update'
									    },
									    data: {
											category: "Notification"
										}
								  	},
								  	apns: {
								    	payload: {
								      		aps: {
								      			sound: "default",
								      			category: "Notification"
								      		},
								    	},
								  	},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                })
				            }
		            	}) 
		                break 
		             case "notifyCall"://notifyCall.js
		            	getUserDetails(input.user_id,function(result){
		            		if(result){
		            			var message_notification = {
				                   
								  	android: {
									    ttl: 35,
									    notification: {
									      	icon: 'stock_ticker_update',
									      	"tag" : input.user_id.toString(),
									      	title: "Memmbles",
				                            body: "Incoming "+input.chat_type+" call from "+input.call_from
									    },
									    data: {
											category: "NotifyCall"
										}
								  	},
			
								  	data: {
										from_id : input.from_id,
										to : input.user_id.toString(),
										chat_type: input.chat_type,
										first_name: input.call_from
									},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                })
				            }
		            	}) 
		                break 
		            case "answerCall"://notifyCall.js
		            	getUserDetails(input.user_id,function(result){
		            		if(result){
		            			var message_notification = {
				                    notification: {
				                        title: "Memmbles",
				                        body: "on "+input.chat_type+" call"
				                    },
								  	android: {
									    ttl: 35,
									    notification: {
									      	icon: 'stock_ticker_update',
									      	"tag": input.user_id.toString()
									    },
									    data: {
											category: "NotifyCall"
										}
								  	},
								  	apns: {
								  		"headers":{
									        "apns-expiration":"1604750400",
									        "apns-collapse-id": input.user_id.toString()
									      },
								    	payload: {
								      		aps: {

								      			sound: "default",
								      			category: "NotifyCall"
								      		},
								    	},
								  	},
								  	data: {
										to : input.user_id.toString()
									},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                })
				            }
		            	}) 
		                break 
		            case "rejectCall"://notifyCall.js
		            	getUserDetails(input.user_id,function(result){
		            		if(result){
		            			var message_notification = {
				                    notification: {
				                        title: "Memmbles",
				                        body: "You missed "+input.chat_type+" call from "+input.call_from
				                    },
								  	android: {
									    ttl: 35,
									    notification: {
									      	icon: 'stock_ticker_update',
									      	"tag": input.user_id.toString()
									    },
									    data: {
											category: "NotifyCall"
										}
								  	},
								  	apns: {
								  		"headers":{
									        "apns-expiration":"1604750400",
									        "apns-collapse-id": input.user_id.toString()
									      },
								    	payload: {
								      		aps: {

								      			sound: "default",
								      			category: "NotifyCall"
								      		},
								    	},
								  	},
								  	data: {
										to : input.user_id.toString()
									},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                })
				            }
		            	}) 
		                break 
		            case "autoendCall"://notifyCall.js
		            	getUserDetails(input.user_id,function(result){
		            		if(result){
		            			var message_notification = {
				                    notification: {
				                        title: "Memmbles",
				                        body: "You missed "+input.chat_type+" call from "+input.call_from
				                    },
								  	android: {
									    ttl: 35,
									    notification: {
									      	icon: 'stock_ticker_update',
									      	"tag": input.user_id.toString()
									    },
									    data: {
											category: "NotifyCall"
										}
								  	},
								  	apns: {
								  		"headers":{
									        "apns-expiration":"1604750400",
									        "apns-collapse-id": input.user_id.toString()
									      },
								    	payload: {
								      		aps: {

								      			sound: "default",
								      			category: "NotifyCall"
								      		},
								    	},
								  	},
								  	data: {
										to : input.user_id.toString()
									},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                })
				            }
		            	}) 
		                break 
		            case "endCall"://notifyCall.js
		            	getUserDetails(input.user_id,function(result){
		            		if(result){
		            			var message_notification = {
				                    notification: {
				                        title: "Memmbles",
				                        body: "You had a "+input.chat_type+" call with "+input.call_from
				                    },
								  	android: {
									    ttl: 35,
									    notification: {
									      	icon: 'stock_ticker_update',
									      	"tag": input.user_id.toString()
									    },
									    data: {
											category: "NotifyCall"
										}
								  	},
								  	apns: {
								  		"headers":{
									        "apns-expiration":"1604750400",
									        "apns-collapse-id": input.user_id.toString()
									      },
								    	payload: {
								      		aps: {

								      			sound: "default",
								      			category: "NotifyCall"
								      		},
								    	},
								  	},
								  	data: {
										to : input.user_id.toString()
									},
								  	token: firebaseRegToken
		                  		};
				                common.sendPushNotification({
				                    firebaseRegToken: firebaseRegToken,
				                    message_notification: message_notification,
				                })
				            }
		            	}) 
		                break
               	}
            }  
        }            
   	})

   	function getUserDetails(userId,callback){
	   	db.get().collection('users').find({
	    	"_id" : userId
	  	},{
		    "name" : 1,
		    "profile_image" : 1,
		    "_id" : 1
	  	}).toArray(function(err, result){
		    if(err){
		      	console.log(err)      
		      	throw err
		    }
		    let data = result[0]
		    callback(data)
	  	})
  	}

   	function getBadgeNum(userId,callback){
	    var user = db.get().collection('users')
		user.aggregate([{"$match":{"_id" : userId}},
		{
		  	$project: {
		        _id: 1,
		        chat_history_meta: { $objectToArray: "$chat_history_meta" }
		    }
		},
		{
		  	$project: {
		        _id: 0,
		        badge: { $sum: "$chat_history_meta.v" }
		    }
		}
	    ]).toArray(function(err,result){
		    if(err){
		      	console.log(err)      
		      	throw err
		    }
		    let data = result[0]
		    callback(data)
		})
	}
}
module.exports = new PushFirebase()
