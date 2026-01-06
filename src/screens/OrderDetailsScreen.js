import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Card, Text, Button, Divider, List, Menu, ActivityIndicator, Chip } from 'react-native-paper';
import api from '../services/api';

const OrderDetailsScreen = ({ route, navigation }) => {
  const { order, vendorId } = route.params;
  const initialVendorOrderInfo = order.vendors; // Initial data passed from params

  const [currentOrderStatus, setCurrentOrderStatus] = useState(initialVendorOrderInfo.orderStatus);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState(order.paymentStatus);
  const [isPaymentVerified, setIsPaymentVerified] = useState(order.isPaymentVerified);
  
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const orderStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleUpdateOrderStatus = async (newStatus) => {
    closeMenu();
    if (newStatus === currentOrderStatus) return;

    setLoading(true);
    try {
      // Endpoint: /order/status/:orderId/vendor/:vendorId
      // order.orderId is the custom string ID, but backend route typically expects the custom ID for orderId param
      // as seen in controller: findOne({ orderId: orderId, ... })
      
      // Use the vendor ID from the order object itself if available (this is the Supplier's ID)
      // This handles the case where an Admin (logged in with AdminID) is updating a Supplier's order.
      // The backend expects the ID of the vendor IN the order.
      const targetVendorId = initialVendorOrderInfo.vendor?._id || vendorId;

      const url = `/order/status/${order.orderId}/vendor/${targetVendorId}`;
      console.log(`Debug: Calling PUT ${url} with status ${newStatus}`);
      
      const response = await api.put(url, {
         newStatus: newStatus 
      });

      if (response.data) {
          setCurrentOrderStatus(newStatus);
          Alert.alert("Success", `Order status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to update order status";
      Alert.alert("Error", `Status: ${error.response?.status}\nMsg: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async () => {
      setLoading(true);
      const newStatus = currentPaymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
      
      try {
          // Endpoint: /manually-verify-payment
          const response = await api.post('/manually-verify-payment', {
              orderId: order.orderId,
              newStatus: newStatus
          });

          if (response.status === 200) {
              setCurrentPaymentStatus(newStatus);
              setIsPaymentVerified(newStatus === 'Paid');
              Alert.alert("Success", `Payment status updated to ${newStatus}`);
          }
      } catch (error) {
          console.error("Error updating payment status:", error);
          Alert.alert("Error", "Failed to update payment status");
      } finally {
          setLoading(false);
      }
  };


  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title={`Order #${order.orderId}`} subtitle={new Date(order.createdAt).toLocaleString()} />
        <Card.Content>
           
           <View style={styles.row}>
               <Text style={styles.label}>Order Status:</Text>
               <Menu
                  visible={menuVisible}
                  onDismiss={closeMenu}
                  anchor={
                    <Button mode="outlined" onPress={openMenu} disabled={loading} compact>
                        {currentOrderStatus}
                    </Button>
                  }
               >
                   {orderStatuses.map((status) => (
                       <Menu.Item 
                          key={status} 
                          onPress={() => handleUpdateOrderStatus(status)} 
                          title={status} 
                          dense
                       />
                   ))}
               </Menu>
           </View>
           
           <View style={styles.row}>
               <Text style={styles.label}>Payment Status:</Text>
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={[styles.value, {marginRight: 10}]}>{currentPaymentStatus} ({isPaymentVerified ? 'Verified' : 'Not Verified'})</Text>
                    <Button 
                        mode="contained" 
                        onPress={handleUpdatePaymentStatus} 
                        compact 
                        disabled={loading}
                        buttonColor={currentPaymentStatus === 'Paid' ? 'red' : 'green'}
                    >
                        Mark as {currentPaymentStatus === 'Paid' ? 'Unpaid' : 'Paid'}
                    </Button>
               </View>
           </View>


           <Divider style={styles.divider} />
           
           <Text style={styles.sectionHeader}>Customer Details</Text>
           <Text style={styles.value}>{order.customer.name}</Text>
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
             <Text style={styles.value}>{order.customer.contactNumber}</Text>
             <Button 
               icon="phone" 
               mode="contained-tonal" 
               compact
               onPress={() => Linking.openURL(`tel:${order.customer.contactNumber}`)}
             >
               Call
             </Button>
           </View>
           <Text style={styles.value}>{order.shippingAddress.address}, {order.shippingAddress.city}</Text>

           <Divider style={styles.divider} />

           <Text style={styles.sectionHeader}>Vendor Details</Text>
           {initialVendorOrderInfo.vendor && (
               <View>
                   <Text style={{fontSize: 16, fontWeight: 'bold'}}>{initialVendorOrderInfo.vendor.vendorInfo?.businessName || 'Business Name N/A'}</Text>
                   <Text style={styles.value}>Owner: {initialVendorOrderInfo.vendor.name}</Text>
                    {/* Add more vendor details here if needed, like contact number */}
               </View>
           )}

           <Divider style={styles.divider} />

           <Text style={styles.sectionHeader}>Products</Text>
           {(initialVendorOrderInfo.products || []).map((item, index) => (
             <List.Item
                key={index}
                title={item.product.name}
                description={`Qty: ${item.quantity}  |  Price: ₹${item.price}`}
                right={props => <Text {...props} style={{alignSelf: 'center'}}>₹{item.totalAmount}</Text>}
             />
           ))}

           <Divider style={styles.divider} />
           <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 10}}>
                <Text style={{fontWeight: 'bold', fontSize: 16}}>Total Amount:</Text>
                <Text style={{fontWeight: 'bold', fontSize: 16}}>₹{initialVendorOrderInfo.products.reduce((sum, p) => sum + p.totalAmount, 0)}</Text>
           </View>
            
           {loading && <ActivityIndicator animating={true} style={{marginTop: 20}} />}

        </Card.Content>
      </Card>
      
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  card: {
    marginBottom: 20,
    backgroundColor: 'white',
  },
  row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
  },
  label: {
      fontSize: 14,
      color: 'gray',
      fontWeight: 'bold'
  },
  value: {
      fontSize: 16,
  },
  divider: {
      marginVertical: 15
  },
  sectionHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10
  },
});

export default OrderDetailsScreen;
