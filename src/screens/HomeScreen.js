import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView, Modal, TextInput } from 'react-native';
import { Card, Text, Button, Chip, Title, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

const HomeScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [vendorId, setVendorId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState('All'); // All, Today, Yesterday, Last7, Custom
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('vendorId').then(id => {
      if (id) setVendorId(id);
    });
  }, []);

  const fetchOrders = async (pageNum = 1, shouldRefresh = false) => {
    if (!vendorId) return;
    
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      let url = `/order/vendor/${vendorId}?page=${pageNum}&limit=10`;
      
      // Calculate Date Ranges
      const now = new Date();
      let startDate = null;
      let endDate = null;

      if (filterType === 'Today') {
        const start = new Date(now.setHours(0,0,0,0));
        const end = new Date(now.setHours(23,59,59,999));
        startDate = start.toISOString();
        endDate = end.toISOString();
      } else if (filterType === 'Yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday.setHours(0,0,0,0)).toISOString();
        endDate = new Date(yesterday.setHours(23,59,59,999)).toISOString();
      } else if (filterType === 'Last7') {
        const last7 = new Date(now);
        last7.setDate(last7.getDate() - 7);
        startDate = new Date(last7.setHours(0,0,0,0)).toISOString();
        endDate = new Date(now.setHours(23,59,59,999)).toISOString();
      } else if (filterType === 'Custom' && customRange.start && customRange.end) {
          // Assuming format YYYY-MM-DD
          startDate = new Date(`${customRange.start}T00:00:00`).toISOString();
          endDate = new Date(`${customRange.end}T23:59:59`).toISOString();
      }

      if (startDate && endDate) {
          url += `&startDate=${startDate}&endDate=${endDate}`;
         console.log("Date Filter applied:", { filterType, startDate, endDate, url });
      } else {
         console.log("No Date Filter applied:", { filterType });
      }

      const response = await api.get(url);
      
      if (response.data && response.data.data && response.data.data.orders) {
          const newOrders = response.data.data.orders;
          if (pageNum === 1) {
              setOrders(newOrders);
          } else {
              setOrders(prev => [...prev, ...newOrders]);
          }
          
          if (newOrders.length < 10) {
              setHasMore(false);
          } else {
              setHasMore(true);
          }
      } else {
           if (pageNum === 1) setOrders([]);
           setHasMore(false);
      }

    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
      if(vendorId) {
          setPage(1);
          setHasMore(true);
          fetchOrders(1, true);
      }
  }, [vendorId, filterType, customRange]); 

  // Handlers
  const handleLoadMore = () => {
      if (!loadingMore && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchOrders(nextPage);
      }
  };

  const onRefresh = () => {
      setRefreshing(true);
      setPage(1);
      setHasMore(true);
      fetchOrders(1, true);
  };

  const renderItem = ({ item }) => {
     const vendorOrderInfo = item.vendors; // Since calling getOrdersByVendor returns unwound/filtered vendor specific info in `vendors` object as per the aggregation pipeline in backend
     
    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetails', { order: item, vendorId })}
      >
        <Card.Title
            title={`Order #${item.orderId}`}
            subtitle={new Date(item.createdAt).toDateString()}
            right={(props) => <Chip mode="outlined" style={styles.chip}>{vendorOrderInfo.orderStatus}</Chip>}
        />
        <Card.Content>
            {vendorOrderInfo.vendor && (
                <View style={{marginBottom: 8}}>
                     <Text style={{fontWeight: 'bold', fontSize: 16}}>{vendorOrderInfo.vendor.vendorInfo?.businessName || 'Business Name N/A'}</Text>
                     <Text style={{color: 'gray', fontSize: 14}}>Owner: {vendorOrderInfo.vendor.name}</Text>
                </View>
            )}
            <Divider style={{marginBottom: 8}} />
            <Text variant="bodyMedium">Products: {vendorOrderInfo.products.length}</Text>
            <Text variant="bodyMedium">Total: ₹{vendorOrderInfo.products.reduce((sum, p) => sum + p.totalAmount, 0)}</Text>
            <Text variant="bodySmall" style={{marginTop: 5, color: 'gray'}}>Payment: {item.paymentStatus}</Text>
        </Card.Content>
      </Card>
    );
  };



  return (
    <View style={styles.container}>


      <View style={{ marginBottom: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
              {['All', 'Today', 'Yesterday', 'Last7', 'Custom'].map((type) => (
                  <Chip 
                      key={type} 
                      mode={filterType === type ? 'flat' : 'outlined'} 
                      selected={filterType === type}
                      onPress={() => {
                          if (type === 'Custom') setShowCustomModal(true);
                          else setFilterType(type);
                      }}
                      style={styles.filterChip}
                  >
                      {type === 'Last7' ? 'Last 7 Days' : type}
                  </Chip>
              ))}
          </ScrollView>
      </View>



      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
            const vendorId = item.vendors && item.vendors.vendor ? item.vendors.vendor._id : index;
            return `${item.orderId}_${vendorId}`;
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <Text style={{textAlign: 'center', padding: 10}}>Loading more...</Text> : null}
        ListEmptyComponent={
             !loading && <Text style={{textAlign: 'center', marginTop: 20}}>No orders found.</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Button 
        onPress={() => {
            AsyncStorage.clear().then(() => navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            }));
        }}
        style={styles.logoutBtn}
      >
        Logout
      </Button>
      
      {/* Simple Custom Date Modal Overlay */}
      {showCustomModal && (
        <View style={styles.modalContainer}>
            <View style={styles.modalBody}>
                 <Text style={{fontSize: 18, marginBottom: 15, fontWeight: 'bold'}}>Enter Dates (YYYY-MM-DD)</Text>
                 
                 <View style={{marginBottom: 10}}>
                     <Text>Start Date:</Text>
                     <TextInput 
                        placeholder="2023-12-31" 
                        value={customRange.start}
                        onChangeText={(t) => setCustomRange(prev => ({...prev, start: t}))}
                        style={styles.input}
                     />
                 </View>

                 <View style={{marginBottom: 20}}>
                     <Text>End Date:</Text>
                     <TextInput 
                        placeholder="2024-01-07" 
                        value={customRange.end}
                        onChangeText={(t) => setCustomRange(prev => ({...prev, end: t}))}
                        style={styles.input}
                     />
                 </View>

                 <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
                    <Button mode="text" onPress={() => {
                        setShowCustomModal(false);
                        setFilterType('All'); 
                    }}>Cancel</Button>
                    <Button mode="contained" onPress={() => {
                        if(customRange.start && customRange.end) {
                            setShowCustomModal(false);
                            // Trigger effect by state change already handled? 
                            // Yes, dependency [filterType, customRange] will trigger fetch
                        }
                    }} style={{marginLeft: 10}}>Apply</Button>
                 </View>
            </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  filterContainer: {
      paddingBottom: 5
  },
  filterChip: {
      marginRight: 8
  },
  card: {
    marginBottom: 10,
    backgroundColor: 'white',
  },
  chip: {
      marginRight: 10
  },
  logoutBtn: {
      marginTop: 10
  },
  modalContainer: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
  },
  modalBody: {
      backgroundColor: 'white',
      padding: 20,
      borderRadius: 10,
      width: '80%',
      elevation: 5
  },
  input: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 5,
      padding: 10,
      marginTop: 5
  }
});

export default HomeScreen;
