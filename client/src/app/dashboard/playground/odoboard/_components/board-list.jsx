"use client";
import { EmptyFavorites } from "./empty-favorties";
import { EmptySearch } from "./empty-search";
import { NoBoards } from "./no-boards";

export const BoardList = ({orgId,search,favorites}) =>{
    const data = []; //TODO: CHANGE TO API CALL
    if(!data?.length && search){
        return(
            <EmptySearch/>
        );
    };
    if(!data?.length && favorites){
        return(
            <EmptyFavorites/>
        );
    }
    if(!data?.length){
        return(
            <NoBoards/>
        )
    }

    return(
        <div>
            {JSON.stringify(search)}
            {JSON.stringify(favorites)}
        </div>
    );
};